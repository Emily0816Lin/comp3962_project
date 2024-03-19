
require("dotenv").config();
const express = require('express');
var AWS = require("aws-sdk");
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
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

// Create a new SES object
const ses = new AWS.SES({ apiVersion: "2010-12-01" });

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



app.post('/bookAppointment', async (req, res) => {
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

    try {
        await docClient.put(params).promise();

        console.log('Added appointment to DynamoDB');

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

        await docClient.update(updateParams).promise();

        console.log('Time slot availability updated');

        // Send email notification
        const emailParams = {
            Destination: {
                ToAddresses: [email] // recipient email address
            },
            Message: {
                Body: {
                    Text: {
                        Data: `Hello ${name}, your appointment for ${date} at ${time} has been booked successfully.`
                    }
                },
                Subject: {
                    Data: 'Appointment Confirmation'
                }
            },
            Source: 'eschedulerapp@gmail.com' // sender email address
        };

        await ses.sendEmail(emailParams).promise();

        console.log('Email notification sent');

        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});