use std::sync::Arc;


use std::process::Command;

use tauri::async_runtime::spawn;

use tauri::{AppHandle, Manager, Emitter, Runtime, Window};
use tauri_nspanel::ManagerExt;
use xcap::{image::DynamicImage, Monitor, image::ImageFormat};
use crate::window::WebviewWindowExt;

use crate::CHAT_LABEL;

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
    let panel = app_handle.get_webview_panel(CHAT_LABEL).unwrap();

    panel.show();
}

#[tauri::command]
pub fn hide_chat(app_handle: AppHandle) {
    hide_panel(app_handle.clone(), CHAT_LABEL);

    app_handle.emit("reset_chat", ()).unwrap();
}

#[tauri::command]
pub fn switch_to_chat(app_handle: AppHandle) {

    let chat_window = app_handle.get_webview_window(CHAT_LABEL).unwrap();
    let chat_panel = app_handle.get_webview_panel(CHAT_LABEL).unwrap();

    chat_window.center_at_cursor_monitor().unwrap();
    chat_panel.show();
}

#[tauri::command]
pub async fn screenshot(app_handle: AppHandle, x: u32, y: u32, width: u32, height: u32) -> Result<(), TauriError> {
    let cursor_monitor = monitor::get_monitor_with_cursor().ok_or(
      TauriError::Anyhow(Error::MonitorNotFound.into()))?;

    if width == 0 || height == 0 {
      return Ok(());
    }

    let xcap_monitors = Monitor::all().unwrap();

    let matching_monitor = xcap_monitors.iter()
      .find(|m| m.id().unwrap() == cursor_monitor.id()).ok_or(
        TauriError::Anyhow(Error::MonitorNotFound.into())
    )?;

    let screenshot = matching_monitor.capture_image().unwrap();
    let monitor_scale_factor = matching_monitor.scale_factor().unwrap_or(1.0);

    println!("screenshot: {:?} > {:?}", screenshot.width(), screenshot.height());
    println!("monitor_scale_factor: {:?}", monitor_scale_factor);
    println!("x: {:?}, y: {:?}, width: {:?}, height: {:?}", x, y, width, height);

    let scaled_x = (x as f32 * monitor_scale_factor).round() as u32;
    let scaled_y = (y as f32 * monitor_scale_factor).round() as u32;
    let scaled_width = (width as f32 * monitor_scale_factor).round() as u32;
    let scaled_height = (height as f32 * monitor_scale_factor).round() as u32;

    let area = DynamicImage::from(screenshot).crop(scaled_x, scaled_y, scaled_width, scaled_height);

    let mut buf = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut buf);
    area.write_to(&mut cursor, ImageFormat::Png).unwrap();

    app_handle.emit("screenshot", buf).unwrap();

    Ok(())
}

#[tauri::command]
pub fn capture_screen_interactive(app_handle: AppHandle) -> Result<(), TauriError> {
  spawn(async move {
    let temp_file = "/tmp/ok_thx_screenshot.png";
    let output = Command::new("screencapture")
      .args(["-i", temp_file])
      .output();
    
    match output { Ok(n) => {}, Err(e) => { return; } }

    let file = std::fs::read(temp_file);

    let buf = match file {
      Ok(file) => file,
      Err(e) => return
    };

    app_handle.emit("screenshot", buf).unwrap();

    std::fs::remove_file(temp_file);
  });
  
  Ok(())
}

#[tauri::command]
pub fn set_chat_height(app_handle: AppHandle, height: u32) {
    let chat_window = app_handle.get_webview_window(CHAT_LABEL).unwrap();
    chat_window.set_height(height).unwrap();
}