import React, { useReducer, useState } from "react";
import "./App.css";
import Player from "./Components/Player";
import Wave from "./Components/Wave";

const arr = new Array(512);
arr.fill(0.5);

function App() {
  const [data, setData] = useState(arr);
  const [render, increment] = useReducer((i) => i + 1, 0);
  return (
    <div className="App">
      <header className="App-header">
        <Wave height={100} data={data} setData={setData} render={render} />
        <button onClick={increment}>rerender</button>
        <Player data={data} />
      </header>
    </div>
  );
}

export default App;
