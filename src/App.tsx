import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <header className="App-header">
        <h1>Solar Cell Analytics Application</h1>
        <p>
          A web-based system for analyzing solar cell performance data and calculating electric fee savings.
        </p>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            This is a placeholder. The full application will be built in subsequent tasks.
          </p>
        </div>
      </header>
    </div>
  )
}

export default App