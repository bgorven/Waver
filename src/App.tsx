import "./App.css";
import "rc-slider/assets/index.css";
import Loader from "./Components/Loader";
import Painter from "./Components/Painter";

const data = new Float32Array(512);

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Loader initialData={data} />
        <Painter initialData={data} />
      </header>
    </div>
  );
}

export default App;
