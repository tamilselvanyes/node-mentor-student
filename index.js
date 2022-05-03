import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { ObjectId } from "mongodb";

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
    console.log(student.mentor);
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

app.listen(process.env.PORT, () => console.log(`Server started ${PORT}`));

//Very important code for mongo connection always just as it is.......

async function createConnection() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log("Mongo is connected ✌️😊");
  return client;
}

function getMentorsData() {
  return client.db("b30wd").collection("mentors").find({}).toArray();
}

function createMentor(data) {
  return client.db("b30wd").collection("mentors").insertOne(data);
}

function getStudentsData() {
  return client.db("b30wd").collection("students").find({}).toArray();
}

function createStudent(data) {
  return client.db("b30wd").collection("students").insertOne(data);
}

function getMentorByName(name) {
  return client.db("b30wd").collection("mentors").findOne({ name: name });
}

function getStudentByName(name) {
  return client.db("b30wd").collection("students").findOne({ name: name });
}

function updateMentorAssign(user_id, updateData) {
  return client
    .db("b30wd")
    .collection("mentors")
    .updateOne({ _id: ObjectId(user_id) }, { $set: updateData });
}

function updateStudentmentor(user_id, updateData) {
  return client
    .db("b30wd")
    .collection("students")
    .updateOne({ _id: ObjectId(user_id) }, { $set: updateData });
}

async function getMentorByStudentName(studentname) {
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
