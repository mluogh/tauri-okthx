#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{Listener, Manager, Emitter};
use tauri_nspanel::ManagerExt;
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};
use window::WebviewWindowExt;
use std::sync::Arc;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use arboard::{Clipboard, ImageData};

mod command;
mod window;

pub const CHAT_LABEL: &str = "chat";
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            command::show,
            command::hide_chat,
            command::screenshot,
            command::switch_to_chat,
            command::set_chat_height,
        ])
        .plugin(tauri_nspanel::init())
        .setup(move |app| {
            // Set activation poicy to Accessory to prevent the app icon from showing on the dock
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let handle = app.app_handle();
            let chat_window = handle.get_webview_window(CHAT_LABEL).unwrap();
            let chat_panel = chat_window.to_spotlight_panel()?;

            // Set up clipboard monitoring
            let app_handle = handle.clone();
            let last_clipboard = Arc::new(Mutex::new(String::new()));
            
            thread::spawn(move || {
                let mut ctx = Clipboard::new().unwrap();
                loop {
                    if let Ok(content) = ctx.get_text() {
                        let mut last = last_clipboard.lock().unwrap();
                        if content != *last {
                            *last = content.clone();
                            let _ = app_handle.emit("clipboard_change", content);
                        }
                    }
                    thread::sleep(Duration::from_millis(500));
                }
            });

            Ok(())
        })
        // Register a global shortcut (⌘+K) to toggle the visibility of the spotlight panel
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcut(
                    Shortcut::new(
                        Some(Modifiers::SUPER | Modifiers::SHIFT),
                        Code::KeyF,
                    ),
                )
                .unwrap()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed
                        && shortcut.matches(Modifiers::SUPER | Modifiers::SHIFT, Code::KeyF)
                    {
                        let chat_panel = app.get_webview_panel(CHAT_LABEL).unwrap();

                        if chat_panel.is_visible() {
                            command::capture_screen_interactive(app.clone());
                        } else {
                            let chat_window = app.get_webview_window(CHAT_LABEL).unwrap();

                            chat_window.center_at_cursor_monitor().unwrap();
                            chat_window.set_focus().unwrap();
                            chat_panel.show();
                        }
                    }
                })
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
