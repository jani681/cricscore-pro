import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <div style={{ color: "white", padding: "20px" }}>
      <h1>Cricket App Working ✅</h1>
      <button onClick={() => alert("React Working")}>
        Click Me
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <App />
);
