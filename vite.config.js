import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* `/guia` é o guia de instalação do aluno (public/guia/index.html). Em produção o
   servidor estático já abre a pasta; no `npm run dev` o Vite devolveria o app
   em qualquer rota, então aqui a rota é apontada pro arquivo. */
const guia = () => ({
  name: "guia-do-aluno",
  configureServer(servidor) {
    servidor.middlewares.use((req, _res, next) => {
      if (req.url === "/guia" || req.url === "/guia/") req.url = "/guia/index.html";
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), guia()],
  server: { port: Number(process.env.PORT) || 5173, host: true },
});
