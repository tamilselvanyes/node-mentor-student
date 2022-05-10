import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import {
  getMentorsData,
  createMentor,
  getStudentsData,
  createStudent,
  getMentorByName,
  getStudentByName,
  updateMentorAssign,
  updateStudentmentor,
  getMentorByStudentName,
  createroom,
  bookroom,
  getRoomById,
  getBookingsForRoom,
  getAllRoomDataWithBookings,
  getBookingData,
} from "./helper.js";

const app = express();
dotenv.config();

//middleware --> Intercept  --> Body to JSON
app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGO_URL;

export const client = await createConnection();

app.get("/", function (req, res) {
  res.send("This is backend of mentor and student database");
});

// //eg:API to create mentor
// {"name":"Chandrasekhar"}

app.post("/creatementor", async (req, res) => {
  const data = req.body;
  const mentor = await getMentorByName(data.name);
  let result = "";
  if (mentor === null) {
    result = await createMentor(data);
  } else {
    result = { message: `${data.name} already exists` };
  }

  res.send(result);
});

//API to get all the mentors
app.get("/mentors", async (req, res) => {
  const data = await getMentorsData();
  res.send(data);
});

//API to create student
// {"name":"Gopi","course":"Full Stack Development"}

app.post("/createstudent", async (req, res) => {
  const data = req.body;
  const student = await getStudentByName(data.name);
  let result = "";
  if (student === null) {
    result = await createStudent(data);
  } else {
    result = { message: `${data.name} already exists` };
  }
  res.send(result);
});

//API to get the students
app.get("/students", async (req, res) => {
  const data = await getStudentsData();
  res.send(data);
});

//API to assign the  multiple students to mentors by mentor name
//{"mentorname":"Chandrasekhar" , "students":[{"name":"Ram"},{"name":"Gopi"}]}

app.post("/assignstudents", async (req, res) => {
  const data = req.body;
  let response = [];
  const mentor = await getMentorByName(data.mentorname);
  if (mentor === null) {
    return res.send({ message: "No such mentor" });
  }
  let studentgroup = [];

  if (mentor.mentorFor === null) {
    studentgroup = [];
  } else {
    if (mentor.mentorFor !== undefined) {
      studentgroup = mentor.mentorFor;
    }
  }

  if (data.students != null) {
    for (let i = 0; i < data.students.length; i++) {
      let student = await getStudentByName(data.students[i].name);
      if (student === null) {
        response.push(
          `${data.students[i].name} student is not created, create student then add mentor`
        );
      } else {
        if (student.mentor !== undefined) {
          response.push(
            `${data.students[i].name} student has a mentor already, if you want to change you have to edit`
          );
        } else {
          studentgroup.push(data.students[i]);
          let updatedata = {
            name: data.students[i].name,
            mentor: data.mentorname,
          };

          await updateStudentmentor(student._id, updatedata);
          response.push(`${data.students[i].name} student mentor is assinged`);
        }
      }
    }
  }
  const updateData = {
    name: data.mentorname,
    mentorFor: studentgroup,
  };
  updateMentorAssign(mentor._id, updateData);

  res.send({ message: response });
});

//API to edit the mentor by student
//{"student_name":"Ram","mentor":"Dinesh"}

app.put("/editmentorbyStudent", async (req, res) => {
  const data = req.body;
  const student = await getStudentByName(data.student_name);
  if (student === null) {
    return res.send({ message: "Student not found, please create student" });
  } else {
    const mentor = await getMentorByName(data.mentor);
    if (mentor === null) {
      return res.send({ message: "Mentor not found, please create mentor" });
    }
    const updateData = student;
    updateData.mentor = data.mentor;
    let response = await updateStudentmentor(student._id, updateData);

    //update with old mentors
    const { oldmentor, index } = await getMentorByStudentName(
      data.student_name
    );
    const updateoldmentor = oldmentor;
    if (updateoldmentor !== null && updateoldmentor !== undefined) {
      updateoldmentor.mentorFor.splice(index, 1);
      await updateMentorAssign(updateoldmentor._id, updateoldmentor);
    }

    //update the new Mentor
    const updatenewmentor = mentor;
    if (updatenewmentor !== null && updatenewmentor !== undefined) {
      if (
        updatenewmentor.mentorFor != null &&
        updatenewmentor.mentorFor != undefined
      ) {
        let newField = {
          name: data.student_name,
        };
        updatenewmentor.mentorFor.push(newField);
      } else {
        updatenewmentor.mentorFor = [
          {
            name: data.student_name,
          },
        ];
      }

      await updateMentorAssign(updatenewmentor._id, updatenewmentor);
    }

    res.send(response);
  }
});

//API to assign mentor to student
// {"student_name":"Ajay","mentor":"Sai Mohan"}
app.post("/assignmentor", async (req, res) => {
  const data = req.body;
  const mentor = await getMentorByName(data.mentor);
  if (mentor === null) {
    return res.send({ message: "No such mentor" });
  }

  const student = await getStudentByName(data.student_name);
  if (student === null) {
    return res.send({
      message: "Student not exist please create before you assign a mentor ",
    });
  } else {
    if (student.mentor !== undefined) {
      return res.send({
        message:
          "Student has been already assigned a Mentor you can change by edit option",
      });
    } else {
      const updateData = student;
      updateData.mentor = data.mentor;
      updateStudentmentor(student._id, updateData);

      let studentgroup = [];

      if (mentor.mentorFor === null) {
        studentgroup = [];
      } else {
        if (mentor.mentorFor !== undefined) {
          studentgroup = mentor.mentorFor;
        }
      }

      const assigndata = {
        name: data.student_name,
      };

      studentgroup.push(assigndata);

      const updatementorData = {
        name: data.mentorname,
        mentorFor: studentgroup,
      };
      updateMentorAssign(mentor._id, updatementorData);

      res.send({
        message: `${data.student_name} is assigned to ${data.mentor}`,
      });
    }
  }
});

//HALL BOOKING  INFORMATION STARTS HERE

//API to create room
//Eg: body of API  /createroom
// {"room_id":"7",
// "no_of_seats": "10",
// "amenties": { "kitchen": "true",
//                "TV": "true",
//                "hair_dyer": "true",
//                "ac": "true",
//                "essential_kit": "true"
//             },
// "price_per_hour": "2000"
// }

app.post("/createroom", async (req, res) => {
  const data = req.body;
  //before adding a room we have to check whether the same room is already present or not
  let already_existing = await getRoomById(data.room_id);
  if (already_existing) {
    res.send({ message: "Room already exists" });
    return;
  }
  const response = await createroom(data);

  res.send(response);
});

//API to book room.
// Eg: body of booking request  /bookroom
// {
//   "room_id":"1",
//   "customer_name": "Ronaldo",
//   "date": "05/10/2022",
//   "start_time": "10:00",
//   "end_time": "12:00"
//   }

app.post("/bookroom", async (req, res) => {
  const data = req.body;

  //first check if the room exists or not
  const room = await getRoomById(data.room_id);
  if (room === null) {
    res.send({ message: "Room not found" });
    return;
  }
  //before booking a room we should check whether the room is available for the particular time.
  //  1. check the room id, if there is any booking for the rooms

  const bookings_of_room = await getBookingsForRoom(data.room_id);

  if (bookings_of_room != null) {
    //  2. check the date
    for (let i = 0; i < bookings_of_room.length; i++) {
      if (bookings_of_room[i].date === data.date) {
        //  3. check the time, check whether the start time lies between the start time and
        // the end time of the previous bookings

        if (IsTimeoverlap()) {
          res.send({ message: "Bookings for the Respective time is closed " });
          return;
        }

        function gethours(date) {
          return date.getHours(); // gives the hour of the date
        }

        function getDate(string) {
          return new Date(string);
        }

        function IsTimeoverlap() {
          if (
            (gethours(getDate(`${data.date}, ${data.start_time}`)) <
              gethours(
                getDate(`${data.date}, ${bookings_of_room[i].start_time}`)
              ) &&
              gethours(getDate(`${data.date}, ${data.end_time}`)) <
                gethours(
                  getDate(`${data.date}, ${bookings_of_room[i].start_time}`)
                )) ||
            gethours(getDate(`${data.date}, ${data.start_time}`)) >
              gethours(
                getDate(`${data.date}, ${bookings_of_room[i].end_time}`)
              ) ||
            gethours(getDate(`${data.date}, ${data.end_time}`)) >
              gethours(
                getDate(`${data.date}, ${bookings_of_room[i].end_time} `)
              )
          ) {
            return false;
          } else {
            return true;
          }
        }
      }
    }
  }

  const response = await bookroom(data);
  res.send(response);
});

//API to list all the rooms with booked data
//GET : /getallroomsdata

app.get("/getallroomsdata", async (req, res) => {
  const response = await getAllRoomDataWithBookings();
  res.send(response);
});

//API to list all the rooms with booked data
//GET : /getcustomerbookingdata

app.get("/getcustomerbookingdata", async (req, res) => {
  const response = await getBookingData();
  res.send(response);
});

app.listen(PORT, () => console.log(`Server started ${PORT}`));

//Very important code for mongo connection always just as it is.......

async function createConnection() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log("Mongo is connected ✌️😊");
  return client;
}
