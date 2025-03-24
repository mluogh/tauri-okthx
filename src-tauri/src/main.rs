#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{Listener, Manager};
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
            command::hide,
            command::screenshot,
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
            chat_panel.set_floating_panel(true);

            handle.listen(format!("{}_panel_did_resign_key", OVERLAY_LABEL), move |_| {
                // Hide the panel when it's no longer the key window
                // This ensures the panel doesn't remain visible when it's not actively being used
                println!("overlay panel resigned key");
                panel.order_out(None);
            });

            handle.listen(format!("{}_panel_did_resign_key", CHAT_LABEL), move |_| {
                // Hide the panel when it's no longer the key window
                // This ensures the panel doesn't remain visible when it's not actively being used
                println!("chat panel resigned key");
                chat_panel.order_out(None);
            });

            Ok(())
        })
        // Register a global shortcut (⌘+K) to toggle the visibility of the spotlight panel
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcut(Shortcut::new(Some(Modifiers::SUPER), Code::KeyK))
                .unwrap()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed
                        && shortcut.matches(Modifiers::SUPER, Code::KeyK)
                    {
                        let overlay_window = app.get_webview_window(OVERLAY_LABEL).unwrap();
                        let overlay_panel = app.get_webview_panel(OVERLAY_LABEL).unwrap();

                        let chat_panel = app.get_webview_panel(CHAT_LABEL).unwrap();

                        if overlay_panel.is_visible() || chat_panel.is_visible() {
                            overlay_panel.order_out(None);
                            chat_panel.order_out(None);

                            println!("both panels hidden");
                        } else {
                            overlay_window.fullscreen_at_cursor_monitor().unwrap();
                            println!("overlay panel shown");
                            overlay_window.set_focus().unwrap();
                            overlay_panel.show();
                        }
                    }
                })
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
