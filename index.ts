require("dotenv").config();

import express, { Express } from "express";
import path from "path";
import fs from "fs";
import { Connection } from "mysql2/promise";
import { initDataBase } from "./Server/services/db";
import { initServer } from "./Server/services/server";
import ShopAPI from "./Shop.API";
import ShopAdmin from "./Shop.Admin";

export let server: Express;
export let connection: Connection;

async function launchApplication() {
  connection = await initDataBase();
  server = initServer();

  const apiPath = `/${process.env.API_PATH || "api"}`;
  const adminPath = `/${process.env.ADMIN_PATH || "admin"}`;

  server.use(apiPath, ShopAPI(connection));
  server.use(adminPath, ShopAdmin());

  const clientDist = path.join(__dirname, "Shop.Client", "dist");
  if (fs.existsSync(clientDist)) {
    server.use(express.static(clientDist));
    server.get("*", (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  } else {
    server.get("*", (_req, res) => {
      res.status(503).send(
        "Shop.Client is not built yet. Run: npm run build:client, then restart the server."
      );
    });
  }

  const host = process.env.LOCAL_PATH || "localhost";
  const port = Number(process.env.LOCAL_PORT || 3000);
  server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
  });
}

launchApplication().catch((error) => {
  console.error("Application failed to start:", error);
  process.exit(1);
});
