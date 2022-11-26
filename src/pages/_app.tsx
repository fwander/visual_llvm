import "tailwindcss/tailwind.css";
import "../styles/globals.css";
import type { AppType } from "next/dist/shared/lib/utils";
import { BrowserRouter } from "react-router-dom";

const MyApp: AppType = ({ Component, pageProps }) => {
  return <Component {...pageProps} />;
};

export default MyApp;
