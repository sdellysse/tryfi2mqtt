import bodyParser from "body-parser";
import createExpress from "express";
import createRouter from "express-promise-router";
import routes from "../lib/routes";

const router = createRouter();
router.get("/users", routes["GET /users"]);
router.get("/users/:id", routes["GET /users/:id"]);
router.patch("/users/:id", routes["PATCH /users/:id"]);

const express = createExpress();

express.use(bodyParser.json());
express.use(router);

express.listen(3000, () => {
  console.log("server started on http://localhost:3000");
});
