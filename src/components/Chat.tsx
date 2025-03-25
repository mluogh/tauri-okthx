function Chat() {
  return (
    <div className="container">
      <div
        className="chat-header"
        data-tauri-drag-region
        style={{ padding: "10px", backgroundColor: "red" }}
      ></div>
      <h2>Tauri MacOS Spotlight App</h2>

      <p style={{ margin: 0 }}>
        Press <kbd>Cmd</kbd>+<kbd>k</kbd> to toggle the spotlight window, or
        press <kbd>Esc</kbd> to hide window.
      </p>

      <form style={{ margin: "10px 0" }}>
        <input type="text" name="text" placeholder="Search..." />
      </form>

      <small className="well">
        This <mark>NSWindow</mark> was converted to <mark>NSPanel</mark> at
        runtime.
      </small>
    </div>
  );
}

export default Chat;
