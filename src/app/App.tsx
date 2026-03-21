import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { Providers } from "./providers";

export function App(): React.ReactNode {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
