import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { Tab, Tabs } from "@mui/material";
import { Box } from "@mui/system";
import { useState } from "react";
import "./App.css";
import Loader from "./Components/Loader";
import Painter from "./Components/Painter";

const data = new Float32Array(512);

function TabPanel(props: any) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [tab, setTab] = useState(0);
  const [painters, setPainters] = useState(1);

  return (
    <div className="App">
      <header className="App-header">
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          aria-label="basic tabs example"
        >
          <Tab label="Painter" />
          <Tab label="Loader" />
        </Tabs>
        <TabPanel value={tab} index={0}>
          {[...Array(painters).keys()].map((i) => (
            <Painter key={i} initialData={data} />
          ))}

          <Box sx={{ p: 1 }}>
            <button onClick={() => setPainters(painters + 1)}>
              <AddIcon />
            </button>
            <button onClick={() => setPainters(painters - 1)}>
              <RemoveIcon />
            </button>
          </Box>
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <Loader initialData={data} />
        </TabPanel>
      </header>
    </div>
  );
}

export default App;
