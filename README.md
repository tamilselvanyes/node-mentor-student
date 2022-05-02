# node-mentor-student

This API contains end points for 

1.API to get all the mentors **endpoint:/mentors**


2.API to create mentor **endpoint:/creatementor**
Eg: {"name":"Chandrasekhar"}


3.API to get the students **endpoint:/students**


4.API to create student **endpoint:/createStudent**
Eg: {"name":"Gopi","course":"Full Stack Development"}


5.API to assign the  multiple students to mentors by mentor name **endpoint:/assignstudents**
Eg: {"mentorname":"Chandrasekhar" , "students":[{"name":"Ram"},{"name":"Gopi"}]}


6.API to edit the mentor by student **endpoint:/editmentorbyStudent**
Eg: {"student_name":"Ram","mentor":"Dinesh"}


7.API to assign mentor to student **endpoint:/assignmentor**
Eg: {"student_name":"Ajay","mentor":"Sai Mohan"}
