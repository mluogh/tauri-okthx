use tauri::{Emitter, Manager, Runtime, WebviewWindow, PhysicalSize, Size};
use tauri_nspanel::{
    cocoa::{
        appkit::{NSMainMenuWindowLevel, NSView, NSWindowCollectionBehavior},
        base::{id, YES},
        foundation::{NSPoint, NSRect, NSSize},
    },
    objc::{msg_send, sel, sel_impl},
    panel_delegate, Panel, WebviewWindowExt as PanelWebviewWindowExt,
};
use thiserror::Error;

type TauriError = tauri::Error;

#[derive(Error, Debug)]
enum Error {
    #[error("Unable to convert window to panel")]
    Panel,
    #[error("Monitor with cursor not found")]
    MonitorNotFound,
}

pub trait WebviewWindowExt {
    fn to_spotlight_panel(&self) -> tauri::Result<Panel>;

    fn fullscreen_at_cursor_monitor(&self) -> tauri::Result<()>;

    fn center_at_cursor_monitor(&self) -> tauri::Result<()>;

    fn set_height(&self, height: u32) -> tauri::Result<()>;
}

impl<R: Runtime> WebviewWindowExt for WebviewWindow<R> {
    fn to_spotlight_panel(&self) -> tauri::Result<Panel> {
        // Convert window to panel
        let panel = self
            .to_panel()
            .map_err(|_| TauriError::Anyhow(Error::Panel.into()))?;

        // Set panel level
        panel.set_level(NSMainMenuWindowLevel + 1);

        // Allows the panel to display on the same space as the full screen window
        panel.set_collection_behaviour(
            NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
        );

        #[allow(non_upper_case_globals)]
        const NSWindowStyleMaskNonActivatingPanel: i32 = 1 << 7;
        
        panel.set_style_mask(NSWindowStyleMaskNonActivatingPanel);

        // Set up a delegate to handle key window events for the panel
        //
        // This delegate listens for two specific events:
        // 1. When the panel becomes the key window
        // 2. When the panel resigns as the key window
        //
        // For each event, it emits a corresponding custom event to the app,
        // allowing other parts of the application to react to these panel state changes.

        let panel_delegate = panel_delegate!(SpotlightPanelDelegate {
            window_did_resign_key,
            window_did_become_key
        });

        let app_handle = self.app_handle().clone();

        let label = self.label().to_string();

        panel_delegate.set_listener(Box::new(move |delegate_name: String| {
            match delegate_name.as_str() {
                "window_did_become_key" => {
                    let _ = app_handle.emit(format!("{}_panel_did_become_key", label).as_str(), ());
                }
                "window_did_resign_key" => {
                    let _ = app_handle.emit(format!("{}_panel_did_resign_key", label).as_str(), ());
                }
                _ => (),
            }
        }));

        panel.set_delegate(panel_delegate);

        Ok(panel)
    }

    fn fullscreen_at_cursor_monitor(&self) -> tauri::Result<()> {
        let monitor = monitor::get_monitor_with_cursor()
            .ok_or(TauriError::Anyhow(Error::MonitorNotFound.into()))?;

        let monitor_scale_factor = monitor.scale_factor();

        let monitor_size = monitor.size().to_logical::<f64>(monitor_scale_factor);

        let monitor_position = monitor.position().to_logical::<f64>(monitor_scale_factor);

        let window_handle: id = self.ns_window().unwrap() as _;

        let result = self.set_size(Size::Physical(PhysicalSize::new(
            monitor_size.width as u32,
            monitor_size.height as u32,
        )));

        if let Err(e) = result {
            println!("Error setting window size: {:?}", e);
        }

        let rect = NSRect {
            origin: NSPoint {
                x: monitor_position.x,
                y: monitor_position.y,
            },
            size: NSSize {
                width: monitor_size.width,
                height: monitor_size.height,
            },
        };

        let _: () = unsafe { msg_send![window_handle, setFrame: rect display: YES] };

        Ok(())
    }

    fn center_at_cursor_monitor(&self) -> tauri::Result<()> {
        let monitor = monitor::get_monitor_with_cursor()
            .ok_or(TauriError::Anyhow(Error::MonitorNotFound.into()))?;

        let monitor_scale_factor = monitor.scale_factor();

        let monitor_size = monitor.size().to_logical::<f64>(monitor_scale_factor);

        let monitor_position = monitor.position().to_logical::<f64>(monitor_scale_factor);

        let window_handle: id = self.ns_window().unwrap() as _;
        let frame: NSRect = unsafe { msg_send![window_handle, frame] };

        // Put it near the bottom of monitor but centered horizontally
        let rect = NSRect {
            origin: NSPoint {
                x: (monitor_position.x + (monitor_size.width / 2.0))
                    - (frame.size.width / 2.0),
                // Cocoa/MacOS has 0, 0 at bottom left <skull emoji>
                y: monitor_position.y + 50.0,
            },
            size: frame.size,
        };

        let _: () = unsafe { msg_send![window_handle, setFrame: rect display: YES] };

        Ok(())
    }

    fn set_height(&self, height: u32) -> tauri::Result<()> {
        let window_handle: id = self.ns_window().unwrap() as _;
        let frame: NSRect = unsafe { msg_send![window_handle, frame] };

        let size = NSSize {
            width: 500.0,
            height: height as f64,
        };

        let rect = NSRect {
            origin: frame.origin,
            size,
        };

        let _: () = unsafe { msg_send![window_handle, setFrame: rect display: YES] };

        Ok(())
    }
}
