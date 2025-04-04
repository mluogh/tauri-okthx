#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{Listener, Manager, Emitter};
use tauri_nspanel::ManagerExt;
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};
use window::WebviewWindowExt;

mod command;
mod window;

pub const OVERLAY_LABEL: &str = "overlay";
pub const CHAT_LABEL: &str = "chat";
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            command::show,
            command::hide_all,
            command::screenshot,
            command::switch_to_chat,
            command::set_chat_height,
        ])
        .plugin(tauri_nspanel::init())
        .setup(move |app| {
            // Set activation poicy to Accessory to prevent the app icon from showing on the dock
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let handle = app.app_handle();

            let window = handle.get_webview_window(OVERLAY_LABEL).unwrap();

            // Convert the window to a spotlight panel
            let panel = window.to_spotlight_panel()?;

            let chat_window = handle.get_webview_window(CHAT_LABEL).unwrap();

            let chat_panel = chat_window.to_spotlight_panel()?;
            // TODO: figure out how to make this work?
            // chat_panel.set_moveable_by_window_background(true);

            handle.listen(format!("{}_panel_did_resign_key", OVERLAY_LABEL), move |_| {
                // Hide the panel when it's no longer the key window
                // This ensures the panel doesn't remain visible when it's not actively being used
                panel.order_out(None);
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
                        let overlay_window = app.get_webview_window(OVERLAY_LABEL).unwrap();
                        let overlay_panel = app.get_webview_panel(OVERLAY_LABEL).unwrap();

                        let chat_panel = app.get_webview_panel(CHAT_LABEL).unwrap();

                        if overlay_panel.is_visible() || chat_panel.is_visible() {
                            overlay_panel.order_out(None);
                            chat_panel.order_out(None);
                            app.emit("reset", ()).unwrap();

                            println!("both panels hidden");
                        } else {
                            overlay_window.fullscreen_at_cursor_monitor().unwrap();
                            app.emit("start_screenshot", ()).unwrap();
                            println!("overlay panel shown");
                            overlay_panel.show();
                            overlay_window.set_focus().unwrap();
                        }
                    }
                })
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
