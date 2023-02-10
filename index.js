import Express from "express";

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import admin from "firebase-admin";
import bodyParser from "body-parser";
import fs from "fs";

const fb = initializeApp({
  credential: admin.credential.cert("./serviceAccount.json"),
});

const db = admin.firestore();
const statesJson = fs.readFileSync("./AppBrain/states.json");
const states = JSON.parse(statesJson);
const getStates = (req, res) => {
  res.send(states);
};

const app = Express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
class State {
  constructor() {
    this.data = {};
    this.setData = (item) => {
      this.data = { ...this.data, [item.id]: item };
    };
  }
}

const RoutesData = new State();
const unsubRoutes = () =>
  db.collection("routes").onSnapshot((snapshots) => {
    snapshots.forEach(async (snapshot) => {
      RoutesData.setData(snapshot.data());
    });
  });
unsubRoutes();
const VehiclesData = new State();
const unsubVehicles = () =>
  db.collection("vehicles").onSnapshot((snapshots) => {
    snapshots.forEach(async (snapshot) => {
      const data = snapshot.data();
      VehiclesData.setData(data);
    });
  });
unsubVehicles();
const UsersData = new State();
const unsubUsers = () =>
  db.collection("users").onSnapshot((snapshots) => {
    snapshots.forEach(async (snapshot) => {
      UsersData.setData(snapshot.data());
    });
  });
unsubUsers();
const StationsData = new State();
const unsubStations = () =>
  db.collection("stations").onSnapshot((snapshots) => {
    snapshots.forEach(async (snapshot) => {
      StationsData.setData(snapshot.data());
    });
  });
unsubStations();
app.get("/states", getStates);
app.post("/states", (req, res) => {
  const states = req.body;
  const statesJson = JSON.stringify(states);
  fs.writeFileSync("./AppBrain/states.json", statesJson);
});
app.post("/api", (req, res) => {
  const staff = req.body;
  getAuth(fb)
    .createUser({
      uid: staff.id,
      email: staff.email,
      phoneNumber: staff.phoneNumber,
      password: staff.password,
      emailVerified: true,
      disabled: false,
      displayName: staff.firstName + " " + staff.lastName,
    })
    .then(async (userRecord) => {
      const userRef = db.doc(`/users/${userRecord.uid}`);
      const snapshot = await userRef.get();
      if (!snapshot.exists) {
        const { displayName, email } = userRecord;
        const createdAt = db.FieldValue.serverTimestamp();
        const { password, ...addtionalData } = staff;
        try {
          userRef
            .set({
              displayName,
              createdAt,
              ...addtionalData,
            })
            .then(() => res.send(true));
        } catch (error) {
          res.send("error creating user", error.message);
        }
      }
    })
    .catch((error) => {
      res.send(error.message);
    });
});
app.get("/test", (res, req) => {});
app.get("/routes", (req, res) => res.send(RoutesData.data));
app.get("/stations", (req, res) => res.send(StationsData.data));
app.get("/users", (req, res) => {
  if (req.query.uid) {
    const uid = req.query.uid;
    res.send(UsersData.data[uid]);
  }
  if (req.query.role) {
    const role = req.query.role;
    const findUser = Object.keys(UsersData.data)
      .map((key) => UsersData.data[key])
      .filter((User) => User.role === role);
    const userObject = {};
    findUser.map((user) => {
      Object.assign(userObject, { [user.displayName]: user });
    });
    res.send(userObject);
  }
});
app.get("/vehicles", (req, res) => {
  if (req.query.type === "interState") {
    const vehiclesSearch = Object.keys(VehiclesData.data)
      .map((key) => VehiclesData.data[key])
      .filter((vehicle) => vehicle.station === "");
    const foundVehicles = {};
    vehiclesSearch.map((vehicle) =>
      Object.assign(foundVehicles, { [vehicle.id]: vehicle })
    );
    res.send(foundVehicles);
  }
  if (req.query.station) {
    const vehiclesSearch = Object.keys(VehiclesData.data)
      .map((key) => VehiclesData.data[key])
      .filter((vehicle) => vehicle.station === req.query.station);
    const foundVehicles = {};
    vehiclesSearch.map((vehicle) =>
      Object.assign(foundVehicles, { [vehicle.id]: vehicle })
    );
    res.send(foundVehicles);
  }
  // res.send(VehiclesData.data);
});

app.listen(5000, () => console.log("Server running on port 5000"));
