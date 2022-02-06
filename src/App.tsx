import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { Box } from "@mui/system";
import { useState } from "react";
import "./App.css";
import Loader from "./Components/Loader";
import Painter from "./Components/Painter";

const data = new Float32Array(512);

function App() {
  const [painters, setPainters] = useState([] as Float32Array[]);

  return (
    <div className="App">
      <header className="App-header">waver</header>
      <div className="App-container">
        <Box sx={{ p: 1 }}>
          <Loader initialData={data} />
        </Box>

        {painters.map((data, i) => (
          <Box sx={{ p: 1 }}>
            <Painter key={i} initialData={data} gain={1 / painters.length} />
          </Box>
        ))}
        <Box sx={{ p: 1 }}>
          <button onClick={() => setPainters(painters.concat([data]))}>
            <AddIcon />
          </button>
          <button
            disabled={painters.length === 0}
            onClick={() => setPainters(painters.slice(0, -1))}
          >
            <RemoveIcon />
          </button>
        </Box>
      </div>
    </div>
  );
}

export default App;
