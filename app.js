
require("dotenv").config();
const express = require('express');
var AWS = require("aws-sdk");
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

let awsConfig = {
    "region": "us-west-2",
    "accessKeyId": process.env.ACCESS_KEY_ID,
    "secretAccessKey": process.env.SECRET_ACCESS_KEY
};
    

AWS.config.update(awsConfig);
let docClient = new AWS.DynamoDB.DocumentClient();

var params = {
    TableName: "appointment",
    
};


app.use(express.static(__dirname));

// DynamoDB Operations: Read all Items for history page
const readAllItems = async () => {
    const params = {
        TableName: "patient"
    };

    try {
        const { Items = [] } = await docClient.scan(params).promise();
        return { success: true, data: Items };
    } catch (error) {
        return { success: false, data: null };
    }
};

// Read all Items
app.get("/history/api/items", async (req, res) => {
    const { success, data } = await readAllItems();

    if (success) {
        return res.json({ success, data });
    }
    return res.status(500).json({ success: false, message: "Error" });
});


app.get('/slots', (req, res) => {
    const date = req.query.date;
    const params = {
        TableName: "appointment",
    };

    // Check if date is provided as query parameter
    if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
    }

    docClient.scan(params, (err, data) => {
        if (err) {
            console.error('Unable to read items. Error JSON:', JSON.stringify(err, null, 2));
            res.status(500).send('Internal Server Error');
        } else {
            console.log('Data received from database:', data);
            
            // Filter the data based on the provided date
            const filteredItems = data.Items.filter(item => item.date === date);
            console.log('Filtered items:', filteredItems);
            
            res.json(filteredItems);
        }
    });
});


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/home.html');
});

// app.get('/help', (req, res) => {
//     res.sendFile(__dirname + '/help.html');
// });

// app.get('/main', (req, res) => {
//     res.sendFile(__dirname + '/main.html');
// });

// app.post('/addTodo', (req, res) => {
//     const newTodo = req.body.newTodo;

//     if (!newTodo) {
//         return res.status(400).json({ error: 'New todo is required' });
//     }

//     const params = {
//         TableName: 'ToDoList',
//         Item: {
//             Task: newTodo
//         }
//     };

//     docClient.put(params, (err, data) => {
//         if (err) {
//             console.error('Unable to add item to DynamoDB. Error JSON:', JSON.stringify(err, null, 2));
//             res.status(500).send('Internal Server Error');
//         } else {
//             console.log('Added item to DynamoDB:', JSON.stringify(data, null, 2));
//             res.json({ success: true });
//         }
//     });
// });


// docClient.scan(params, function(err, data) {
//     if (err) {
//         console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
//     } else {
//         console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
//     }
// });

app.post('/bookAppointment', (req, res) => {
    const { name, email, date, time } = req.body;

    if (!name || !email || !date || !time) {
        return res.status(400).json({ error: 'Name, email, date, and time are required' });
    }

    const params = {
        TableName: 'patient',
        Item: {
            name: name,
            email: email,
            date: date,
            doctorcomment: "", // Empty string for doctor comment
            prescription: "", // Empty string for prescription
            status: "coming", // Default status
            time: time
        }
    };

    docClient.put(params, (err, data) => {
        if (err) {
            console.error('Unable to add appointment to DynamoDB. Error JSON:', JSON.stringify(err, null, 2));
            res.status(500).send('Internal Server Error');
        } else {
            console.log('Added appointment to DynamoDB:', JSON.stringify(data, null, 2));
            // Update the availability of the selected time slot
            const updateParams = {
                TableName: 'appointment',
                Key: {
                    date: date,
                    time: time
                },
                UpdateExpression: 'SET #available = :newValue',
                ExpressionAttributeNames: {
                    '#available': 'Available'
                },
                ExpressionAttributeValues: {
                    ':newValue': 'no'
                }
            };

            docClient.update(updateParams, (err, data) => {
                if (err) {
                    console.error('Error updating time slot availability:', err);
                    // Handle error updating time slot availability
                } else {
                    console.log('Time slot availability updated:', data);
                    // Time slot availability updated successfully
                }
            });

            res.json({ success: true });

        }
    });
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});