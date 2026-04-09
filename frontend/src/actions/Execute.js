import axios from "axios";
import { RUN_CODE_SUCCESS, RUN_CODE_FAILED, RUN_CODE_RUNNING } from "./types";
var server = process.env.REACT_APP_API_URL || "";

const addr = () => {
  if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
    return "http://localhost:6500/code";
  } else {
    return server ? server + "/code" : "/code";
  }
};

const headers = {
  "Content-Type": "multipart/form-data",
};

export const runCode = (code) => (dispatch, getState) => {
  dispatch({ type: RUN_CODE_RUNNING });
  axios
    .post(addr(), code, {
      headers: headers,
    })
    .then((res) => {
      dispatch({
        type: RUN_CODE_SUCCESS,
        payload: res.data,
      });
    })
    .catch((err) => {
      console.log(err);
      dispatch({
        type: RUN_CODE_FAILED,
        payload:
          err?.response?.data ||
          err?.message ||
          "Something went wrong. Please check your setup and try again.",
      });
    });
};
