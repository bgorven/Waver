import React, { useReducer, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import Wave from "./Components/Wave";

const arr = new Array(256);
arr.fill(0.5);

function App() {
  const [data, setData] = useState(arr);
  const [render, increment] = useReducer((i) => i + 1, 0);
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Render: {render}</p>
        <p>Width: {data.length}</p>
        <p>Device pixel ratio: {window.devicePixelRatio}</p>
        <Wave height={100} data={data} setData={setData} render={render} />
        <button onClick={increment}>rerender</button>
      </header>
    </div>
  );
}

export default App;
