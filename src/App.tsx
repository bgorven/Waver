import React from "react";
import "./App.css";
import "rc-slider/assets/index.css";
import Row from "./Components/Row";

const data = new Array(512);
data.fill(0.5);

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Row initialData={data} />
        <Row initialData={data} />
        <Row initialData={data} />
        <Row initialData={data} />
      </header>
    </div>
  );
}

export default App;
