import "@babel/polyfill"
import {createBrowserHistory} from "history"

const history = createBrowserHistory({basename: BASENAME_URL})


export default history