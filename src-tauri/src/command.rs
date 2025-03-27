use std::sync::Arc;

use tauri::{AppHandle, Manager, Emitter};
use tauri_nspanel::ManagerExt;
use xcap::{image::DynamicImage, Monitor, image::ImageFormat};
use crate::window::WebviewWindowExt;

use crate::{OVERLAY_LABEL, CHAT_LABEL};

use thiserror::Error;

type TauriError = tauri::Error;

#[derive(Error, Debug)]
enum Error {
    #[error("Unable to convert window to panel")]
    Panel,
    #[error("Monitor with cursor not found")]
    MonitorNotFound,
}

fn hide_panel(app_handle: AppHandle, name: &str) {
    let panel = app_handle.get_webview_panel(name).unwrap();

    if panel.is_visible() {
        panel.order_out(None);
    }
}

#[tauri::command]
pub fn show(app_handle: AppHandle) {
    let panel = app_handle.get_webview_panel(OVERLAY_LABEL).unwrap();

    panel.show();
}

#[tauri::command]
pub fn hide_all(app_handle: AppHandle) {
    hide_panel(app_handle.clone(), OVERLAY_LABEL);
    hide_panel(app_handle.clone(), CHAT_LABEL);
}

#[tauri::command]
pub fn switch_to_chat(app_handle: AppHandle) {
    hide_panel(app_handle.clone(), OVERLAY_LABEL);

    let chat_window = app_handle.get_webview_window(CHAT_LABEL).unwrap();
    let chat_panel = app_handle.get_webview_panel(CHAT_LABEL).unwrap();

    chat_window.center_at_cursor_monitor().unwrap();
    chat_panel.show();
}

#[tauri::command]
pub async fn screenshot(app_handle: AppHandle, x: u32, y: u32, width: u32, height: u32) -> Result<(), TauriError> {
    let cursor_monitor = monitor::get_monitor_with_cursor().ok_or(
      TauriError::Anyhow(Error::MonitorNotFound.into()))?;

    let xcap_monitors = Monitor::all().unwrap();

    let matching_monitor = xcap_monitors.iter()
      .find(|m| m.id().unwrap() == cursor_monitor.id()).ok_or(
        TauriError::Anyhow(Error::MonitorNotFound.into())
    )?;

    let screenshot = matching_monitor.capture_image().unwrap();

    let area = DynamicImage::from(screenshot).crop(x, y, width, height);

    let mut buf = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut buf);
    area.write_to(&mut cursor, ImageFormat::Png).unwrap();

    app_handle.emit("screenshot", buf).unwrap();

    Ok(())
}
