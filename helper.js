import { ObjectId } from "mongodb";
import { client } from "./index.js";

export function getMentorsData() {
  return client.db("b30wd").collection("mentors").find({}).toArray();
}

export function createMentor(data) {
  return client.db("b30wd").collection("mentors").insertOne(data);
}

export function getStudentsData() {
  return client.db("b30wd").collection("students").find({}).toArray();
}

export function createStudent(data) {
  return client.db("b30wd").collection("students").insertOne(data);
}

export function getMentorByName(name) {
  return client.db("b30wd").collection("mentors").findOne({ name: name });
}

export function getStudentByName(name) {
  return client.db("b30wd").collection("students").findOne({ name: name });
}

export function updateMentorAssign(user_id, updateData) {
  return client
    .db("b30wd")
    .collection("mentors")
    .updateOne({ _id: ObjectId(user_id) }, { $set: updateData });
}

export function updateStudentmentor(user_id, updateData) {
  return client
    .db("b30wd")
    .collection("students")
    .updateOne({ _id: ObjectId(user_id) }, { $set: updateData });
}

export async function getMentorByStudentName(studentname) {
  const mentors = await getMentorsData();
  if (mentors !== null) {
    for (let i = 0; i < mentors.length; i++) {
      if (mentors[i].mentorFor !== null) {
        for (let j = 0; j < mentors[i].mentorFor.length; j++) {
          if (mentors[i].mentorFor[j].name === studentname) {
            return { oldmentor: mentors[i], index: j };
          }
        }
      }
    }
  }
  return { oldmentor: null, index: null };
}

export function createroom(room) {
  return client.db("b30wd").collection("hallrooms").insertOne(room);
}

export function bookroom(room) {
  return client.db("b30wd").collection("bookings").insertOne(room);
}

export function getRoomById(id) {
  return client.db("b30wd").collection("hallrooms").findOne({ room_id: id });
}

export function getBookingsForRoom(id) {
  return client
    .db("b30wd")
    .collection("bookings")
    .find({ room_id: id })
    .toArray();
}

export function getAllRoomDataWithBookings() {
  return client
    .db("b30wd")
    .collection("hallrooms")
    .aggregate([
      {
        $lookup: {
          from: "bookings",
          localField: "room_id",
          foreignField: "room_id",
          as: "bookings",
        },
      },
      { $project: { amenties: 0, _id: 0 } },
    ])
    .toArray();
}

export function getBookingData() {
  return client.db("b30wd").collection("bookings").find({}).toArray();
}
