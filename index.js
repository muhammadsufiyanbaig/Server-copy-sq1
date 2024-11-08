const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require('nodemailer');
const app = express();
const port = 3333;
const bcrypt = require("bcrypt");

app.use(express.static("workdevelopmentproperty"));
app.use(express.static("workholdingproperty"));
app.use(express.static("workothersproperty"));
app.use(express.static("workrentalproperty"));
app.use(express.static("rentaltransaction"));
app.use(express.static("holdingtransaction"));
app.use(express.static("developmenttransaction"));
app.use(express.static("addinvestor"));
app.use(express.static("memberprofile"));
app.use(express.static("holdingproperty"));
app.use(express.static("rentalproperty"));
app.use(express.static("othersproperty"));
app.use(express.static("addinvestment"));
app.use(express.static("developmentproperty"));
app.use(express.static("developmentinvestment"));
app.use(express.static("holdinginvestment"));
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));
app.use(cors());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Sufiy@n3",
  database: "squareone",
});
// const connection = db.promise();

db.connect((err) => {
  if (err) {
    console.error("Unable to connect to MySQL:", err);
  } else {
    console.log("Connected to MySQL");
  }
});
 // Configure the email transport
 const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'send.sufiyan@gmail.com',
    pass: 'jxqm scuj ahsq jsjo',
  },
})
{/* investor notification */}
// Create a new notification for an investor
app.post('/investorNotification/create', (req, res) => {
  const { Title, Message, InvestorID } = req.body;
  if (!Title || !Message || !InvestorID) {
      console.log("Missing required fields:", { Title, Message, InvestorID });
      return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = 'INSERT INTO Investor_Notification (Title, Message, Investor_ID) VALUES (?, ?, ?)';
  db.query(query, [Title, Message, InvestorID], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: results.insertId });
  });
});
// Fetch all notifications for a specific investor
app.post('/investorNotification/get', (req, res) => {
  const { InvestorId } = req.body;
  // console.log("Investor ID:",InvestorId);
  
  const query = 'SELECT * FROM investor_notification WHERE Investor_ID = ?';
  db.query(query, [InvestorId], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      console.log("Notification for Specific Investor: ", results);
      
      res.json(results);
  });
});
// Update the read status of a notification
app.put('/investorNotification/update', (req, res) => {
  const { NotificationID, InvestorId } = req.body;
  if ( !NotificationID || !InvestorId) {
      return res.status(400).json({ error: 'Missing required fields' });
  }
  const query = 'UPDATE Investor_Notification SET Read_Status = TRUE WHERE ID = ? AND Investor_ID = ?';
  db.query(query, [NotificationID, InvestorId], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Notification updated successfully' });
  });
});

{/* Forget Password */}
// OTP SENDER
app.post('/forgot_password', async (req, res) => {
  const { email } = req.body;
  try {
    // Prepare the SQL query
    const sql = "SELECT id FROM investors WHERE email = ?";
    // Use db.query with the callback syntax
    db.query(sql, [email], async (err, rows) => {
      if (err) {
        console.error("Error fetching user data:", err);
        return res.status(500).json({ error: "Internal Server Error", message: err.message });
      }
      if (rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      console.log(rows);
      const investorId = rows[rows.length- 1 ].id;
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString(); // Generate a 4-digit OTP
      const expiry = new Date(Date.now() + 15 * 60 * 1000); // OTP valid for 1.5 minutes
      // Store the OTP in the otp table
      const insertSql = "INSERT INTO otp (investor_id, otp_code, expiry) VALUES (?, ?, ?)";
      db.query(insertSql, [investorId, otpCode, expiry], async (err) => {
        if (err) {
          console.error("Error storing OTP:", err);
          return res.status(500).json({ error: "Internal Server Error", message: err.message });
        }
        const mailOptions = {
          to: email,
          subject: 'Password Reset OTP of Square1Capital',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; max-width: 600px; margin: auto;">
              <img src="cid:logo" alt="Logo" style="width: 150px; display: block; margin: 0 auto;"/>
              <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
              <p style="color: #555;">You requested to reset your password. Please use the following OTP to proceed:</p>
              <h1 style="color: #880808; text-align: center;">${otpCode}</h1>
              <p style="color: #555;">This OTP is valid for 1.5 minutes (90 seconds). If you did not request this, please ignore this email.</p>
              <p style="color: #555;">Thank you!</p>
              <footer style="margin-top: 20px; font-size: 12px; color: #888; text-align: center;">
                <p>This email was sent to you because you requested a password reset.</p>
              </footer>
            </div>
          `,
          attachments: [
            {
              filename: 'logo.png',
              path: './logo.png', // Change this to the actual path of your logo file
              cid: 'logo' // This is the content ID used in the HTML to reference the image
            }
          ],
        };
        await transporter.sendMail(mailOptions);
        res.json({ message: 'OTP sent to your email address' , investorId: investorId});
      });
    });
  } catch (error) {
    console.error('Error in /forgot-password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// OTP verfication
app.post('/verify_otp', (req, res) => {
  const { otpCode, id } = req.body;
  /* Query to get valid OTP record */
  const sqlGetOtpRecord = `
    SELECT * FROM otp WHERE investor_id = ? AND otp_code = ? AND expiry > NOW() AND is_used = FALSE;
  `;
  db.query(sqlGetOtpRecord, [id, otpCode], (err, otpRecords) => {
    if (err) {
      console.error('Error fetching OTP data:', err);
      return res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    if (otpRecords.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    res.json({ message: 'OTP is valid'});
  });
});
// new Password
app.post('/reset_password', async (req, res) => {
  const { id, newPassword } = req.body;
    /* Query to update password */
    const sqlUpdatePassword = `
      UPDATE investors SET investorpassword = ? WHERE id = ?;
    `;
    db.query(sqlUpdatePassword, [newPassword, id], (err) => {
      if (err) {
        console.error('Error updating password:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: err.message });
      }
      res.json({ message: 'Password has been successfully reset' });
    });
});

// OTP SENDER FOR ADMIN
app.post('/forgot_password_admin', async (req, res) => {
  const { email } = req.body;
  try {
    // Prepare the SQL query
    const sql = "SELECT id FROM administrators WHERE email = ?";
    // Use db.query with the callback syntax
    db.query(sql, [email], async (err, rows) => {
      if (err) {
        console.error("Error fetching user data:", err);
        return res.status(500).json({ error: "Internal Server Error", message: err.message });
      }
      if (rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      console.log(rows);
      const adminId = rows[rows.length- 1 ].id;
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString(); // Generate a 4-digit OTP
      const expiry = new Date(Date.now() + 15 * 60 * 1000); // OTP valid for 1.5 minutes
      // Store the OTP in the otp table
      const insertSql = "INSERT INTO otp (investor_id, otp_code, expiry) VALUES (?, ?, ?)";
      db.query(insertSql, [adminId, otpCode, expiry], async (err) => {
        if (err) {
          console.error("Error storing OTP:", err);
          return res.status(500).json({ error: "Internal Server Error", message: err.message });
        }
        const mailOptions = {
          to: email,
          subject: 'Password Reset OTP of Square1Capital',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; max-width: 600px; margin: auto;">
              <img src="cid:logo" alt="Logo" style="width: 150px; display: block; margin: 0 auto;"/>
              <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
              <p style="color: #555;">You requested to reset your password. Please use the following OTP to proceed:</p>
              <h1 style="color: #880808; text-align: center;">${otpCode}</h1>
              <p style="color: #555;">This OTP is valid for 1.5 minutes (90 seconds). If you did not request this, please ignore this email.</p>
              <p style="color: #555;">Thank you!</p>
              <footer style="margin-top: 20px; font-size: 12px; color: #888; text-align: center;">
                <p>This email was sent to you because you requested a password reset.</p>
              </footer>
            </div>
          `,
          attachments: [
            {
              filename: 'logo.png',
              path: './logo.png', // Change this to the actual path of your logo file
              cid: 'logo' // This is the content ID used in the HTML to reference the image
            }
          ],
        };
        await transporter.sendMail(mailOptions);
        res.json({ message: 'OTP sent to your email address' , adminId: adminId});
      });
    });
  } catch (error) {
    console.error('Error in /forgot-password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// new Password for admin
app.post('/reset_password_admin', async (req, res) => {
  const { id, newPassword } = req.body;
    /* Query to update password */
    const sqlUpdatePassword = `
      UPDATE administrators SET password = ? WHERE id = ?;
    `;
    db.query(sqlUpdatePassword, [newPassword, id], (err) => {
      if (err) {
        console.error('Error updating password:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: err.message });
      }
      res.json({ message: 'Password has been successfully reset' });
    });
});



app.get("/tenanttype", (req, res) => {
  const sql =
    "SELECT tenantcategory, SUM(propertysize) AS size FROM rentalproperty GROUP BY tenantcategory";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching tenant type data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Tenant type data retrieved successfully");
      return res.status(200).json(results);
    }
  });
});

app.get("/developmenttype", (req, res) => {
  const sql =
    "SELECT typeofproperty, COUNT(*) AS count FROM developmentproperty GROUP BY typeofproperty";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching development type data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (results.length === 0) {
        console.log("No data found for development type");
        return res
          .status(404)
          .json({ message: "No data found for development type" });
      }

      // Calculate total count
      const totalCount = results.reduce((acc, cur) => acc + cur.count, 0);

      // Calculate percentage for each type of property
      const dataWithPercentage = results.map((row) => {
        return {
          typeofproperty: row.typeofproperty,
          percentage: ((row.count / totalCount) * 100).toFixed(2) + "%",
        };
      });

      console.log("Development type data retrieved successfully");
      return res.status(200).json(dataWithPercentage);
    }
  });
});

app.get("/holdingtype", (req, res) => {
  const sql =
    "SELECT typeofproperty, COUNT(*) AS count FROM holdingproperty GROUP BY typeofproperty";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching holding type data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (results.length === 0) {
        console.log("No data found for holding type");
        return res
          .status(404)
          .json({ message: "No data found for holding type" });
      }

      // Calculate total count
      const totalCount = results.reduce((acc, cur) => acc + cur.count, 0);

      // Calculate percentage for each type of property
      const dataWithPercentage = results.map((row) => {
        return {
          typeofproperty: row.typeofproperty,
          percentage: ((row.count / totalCount) * 100).toFixed(2) + "%",
        };
      });

      console.log("Holding type data retrieved successfully");
      return res.status(200).json(dataWithPercentage);
    }
  });
});

app.get("/rentaltype", (req, res) => {
  const sql =
    "SELECT typeofproperty, COUNT(*) AS count FROM rentalproperty GROUP BY typeofproperty";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching rental type data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (results.length === 0) {
        console.log("No data found for rental type");
        return res
          .status(404)
          .json({ message: "No data found for rental type" });
      }

      // Calculate total count
      const totalCount = results.reduce((acc, cur) => acc + cur.count, 0);

      // Calculate percentage for each type of property
      const dataWithPercentage = results.map((row) => {
        return {
          typeofproperty: row.typeofproperty,
          percentage: ((row.count / totalCount) * 100).toFixed(2) + "%",
        };
      });

      console.log("Rental type data retrieved successfully");
      return res.status(200).json(dataWithPercentage);
    }
  });
});
app.get("/totalpropertiespercentage", (req, res) => {

  // Query to get the counts of properties from each table
  const sql = `
    SELECT 'rentalproperty' AS table_name, typeofproperty AS property_type, COUNT(*) AS count 
    FROM rentalproperty
    GROUP BY typeofproperty
    UNION
    SELECT 'holdingproperty' AS table_name, typeofproperty AS property_type, COUNT(*) AS count 
    FROM holdingproperty
    GROUP BY typeofproperty
    UNION
    SELECT 'developmentproperty' AS table_name, typeofproperty AS property_type, COUNT(*) AS count 
    FROM developmentproperty
    GROUP BY typeofproperty
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching property count data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (results.length === 0) {
        console.log("No data found for property count");
        return res
          .status(404)
          .json({ message: "No data found for property count" });
      }

      // Calculate total count of properties
      const totalCount = results.reduce((acc, cur) => acc + cur.count, 0);

      // Calculate percentage for each type of property
      const dataWithPercentage = results.map((row) => {
        return {
          table_name: row.table_name,
          count: row.count,
          percentage: ((row.count / totalCount) * 100).toFixed(2) + "%",
        };
      });

      console.log("Property count data retrieved successfully");
      return res.status(200).json(dataWithPercentage);
    }
  });
});

app.post("/contactus", (req, res) => {
  const { name, email, message, phonenumber, profilepicture } = req.body;
  const defaultStatus = "pending"; // Set the default status value

  const sql =
    "INSERT INTO contact_us (name, email, message, phonenumber, status,profilepicture) VALUES (?, ?, ?, ?, ?,?)";
  db.query(
    sql,
    [name, email, message, phonenumber, defaultStatus, profilepicture],
    (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res
          .status(500)
          .json({ error: "Internal Server Error", message: err.message });
      } else {
        console.log("Data inserted successfully");
        return res
          .status(200)
          .json({ message: "Contact details added successfully" });
      }
    }
  );
});
app.get("/support", (req, res) => {
  const sql = "SELECT * FROM contact_us WHERE status = ?";
  const status = "pending";

  db.query(sql, [status], (err, results) => {
    if (err) {
      console.error("Error fetching pending contact data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      // console.log('Pending contact data retrieved successfully');
      return res.status(200).json(results);
    }
  });
});

app.get("/resolvedcontacts", (req, res) => {
  const sql = "SELECT * FROM contact_us WHERE status = ?";
  const status = "resolved";

  db.query(sql, [status], (err, results) => {
    if (err) {
      console.error("Error fetching resolved contact data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Resolved contact data retrieved successfully");
      return res.status(200).json(results);
    }
  });
});

app.put("/contactus/:id/resolve", (req, res) => {
  const contactId = req.params.id;

  // Your logic to update the status of the contact with ID `contactId` to 'resolved'
  const sql = "UPDATE contact_us SET status = ? WHERE id = ?";
  const status = "resolved";

  db.query(sql, [status, contactId], (err, result) => {
    if (err) {
      console.error("Error updating contact status:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({
          error: "Not Found",
          message: `Contact with ID ${contactId} not found`,
        });
    }

    // Send a response indicating that the contact was successfully resolved
    res.send(`Contact with ID ${contactId} has been resolved`);
  });
});

app.get("/disableholdingproperties", (req, res) => {
  const sql = "SELECT * FROM holdingproperty WHERE propertystatus = ?"; // Add a WHERE clause to filter by status

  // Assuming 'disabled' is the status value for disabled properties
  const status = "disabled";

  db.query(sql, [status], (err, result) => {
    if (err) {
      console.error("Error fetching disabled properties:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      return res.status(200).json({ data: result });
    }
  });
});

app.put("/holdingproperty/:id/disable", (req, res) => {
  const investorId = req.params.id;

  // Your logic to update the status of the investor with ID `investorId` to 'disabled'
  const sql = "UPDATE holdingproperty SET propertystatus = ? WHERE id = ?";
  const status = "disabled";

  db.query(sql, [status, investorId], (err, result) => {
    if (err) {
      console.error("Error updating investor status:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({
          error: "Not Found",
          message: `Investor with ID ${investorId} not found`,
        });
    }

    // Send a response indicating that the investor was successfully disabled
    res.send(`Holdingproperty with ID ${investorId} has been disabled`);
  });
});

app.put("/holdingproperty/:id/enable", (req, res) => {
  const investorId = req.params.id;

  // Your logic to update the status of the investor with ID `investorId` to 'enabled'
  const sql = "UPDATE holdingproperty  SET  propertystatus = ? WHERE id = ?";
  const status = "enabled";

  db.query(sql, [status, investorId], (err, result) => {
    if (err) {
      console.error("Error updating investor status:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({
          error: "Not Found",
          message: `Investor with ID ${investorId} not found`,
        });
    }

    res.send(`Holdingproperty with ID ${investorId} has been enabled`);
  });
});

app.get("/disablerentalproperties", (req, res) => {
  const sql = "SELECT * FROM rentalproperty WHERE propertystatus = ?";

  const status = "disabled";

  db.query(sql, [status], (err, result) => {
    if (err) {
      console.error("Error fetching disabled properties:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      return res.status(200).json({ data: result });
    }
  });
});

app.put("/rentalproperty/:id/disable", (req, res) => {
  const investorId = req.params.id;

  // Your logic to update the status of the investor with ID `investorId` to 'disabled'
  const sql = "UPDATE rentalproperty SET propertystatus = ? WHERE id = ?";
  const status = "disabled";

  db.query(sql, [status, investorId], (err, result) => {
    if (err) {
      console.error("Error updating investor status:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({
          error: "Not Found",
          message: `Investor with ID ${investorId} not found`,
        });
    }

    // Send a response indicating that the investor was successfully disabled
    res.send(`Rentalproperty with ID ${investorId} has been disabled`);
  });
});

app.put("/rentalproperty/:id/enable", (req, res) => {
  const investorId = req.params.id;

  // Your logic to update the status of the investor with ID `investorId` to 'enabled'
  const sql = "UPDATE rentalproperty  SET  propertystatus = ? WHERE id = ?";
  const status = "enabled";

  db.query(sql, [status, investorId], (err, result) => {
    if (err) {
      console.error("Error updating investor status:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({
          error: "Not Found",
          message: `Investor with ID ${investorId} not found`,
        });
    }

    // Send a response indicating that the investor was successfully enabled
    res.send(`Rentalproperty with ID ${investorId} has been enabled`);
  });
});

app.get("/disabledevelopmentproperties", (req, res) => {
  const sql = "SELECT * FROM developmentproperty WHERE propertystatus = ?"; // Add a WHERE clause to filter by status

  // Assuming 'disabled' is the status value for disabled properties
  const status = "disabled";

  db.query(sql, [status], (err, result) => {
    if (err) {
      console.error("Error fetching disabled properties:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      return res.status(200).json({ data: result });
    }
  });
});

app.put("/developmentproperty/:id/disable", (req, res) => {
  const investorId = req.params.id;

  // Your logic to update the status of the investor with ID `investorId` to 'disabled'
  const sql = "UPDATE developmentproperty SET propertystatus = ? WHERE id = ?";
  const status = "disabled";

  db.query(sql, [status, investorId], (err, result) => {
    if (err) {
      console.error("Error updating investor status:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({
          error: "Not Found",
          message: `Investor with ID ${investorId} not found`,
        });
    }

    // Send a response indicating that the investor was successfully disabled
    res.send(`Developmentproperty with ID ${investorId} has been disabled`);
  });
});

app.put("/developmentproperty/:id/enable", (req, res) => {
  const investorId = req.params.id;

  // Your logic to update the status of the investor with ID `investorId` to 'enabled'
  const sql =
    "UPDATE developmentproperty  SET  propertystatus = ? WHERE id = ?";
  const status = "enabled";

  db.query(sql, [status, investorId], (err, result) => {
    if (err) {
      console.error("Error updating investor status:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({
          error: "Not Found",
          message: `Investor with ID ${investorId} not found`,
        });
    }

    // Send a response indicating that the investor was successfully enabled
    res.send(`Developmentproperty with ID ${investorId} has been enabled`);
  });
});

app.put("/investors/:id/disable", (req, res) => {
  const investorId = req.params.id;
  // Your logic to update the status of the investor with ID `investorId` to 'disabled'
  const sql = "UPDATE investors SET status = ? WHERE id = ?";
  const status = "disabled";
  db.query(sql, [status, investorId], (err, result) => {
    if (err) {
      console.error("Error updating investor status:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({
          error: "Not Found",
          message: `Investor with ID ${investorId} not found`,
        });
    }
    // Send a response indicating that the investor was successfully disabled
    res.send(`Investor with ID ${investorId} has been disabled`);
  });
});

app.put("/investors/:id/enable", (req, res) => {
  const investorId = req.params.id;

  // Your logic to update the status of the investor with ID `investorId` to 'enabled'
  const sql = "UPDATE investors SET status = ? WHERE id = ?";
  const status = "enabled";

  db.query(sql, [status, investorId], (err, result) => {
    if (err) {
      console.error("Error updating investor status:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({
          error: "Not Found",
          message: `Investor with ID ${investorId} not found`,
        });
    }

    // Send a response indicating that the investor was successfully enabled
    res.send(`Investor with ID ${investorId} has been enabled`);
  });
});
app.get("/investors/count", (req, res) => {
  const sql = "SELECT COUNT(*) AS totalInvestors FROM  investors"; // Assuming your table name is 'investors'
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error executing MySQL query: ", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }
    const totalInvestors = result[0].totalInvestors;
    res.json({ totalInvestors });
  });
});
app.get("/Totalnumberofproperties", async (req, res) => {
  const sql = `
    SELECT SUM(totalProperties) AS totalProperties FROM (
      SELECT COUNT(*) AS totalProperties FROM rentalproperty
      UNION ALL
      SELECT COUNT(*) AS totalProperties FROM holdingproperty
      UNION ALL
      SELECT COUNT(*) AS totalProperties FROM developmentproperty
    ) AS combinedCounts`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error executing MySQL query: ", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }
    const totalProperties = result[0].totalProperties;
    res.json({ totalProperties });
  });
});

app.get("/averageSqft", async (req, res) => {
  const sql = `
    SELECT ROUND(AVG(avgSqft), 3) AS overallAvgSqft FROM (
      SELECT AVG(rentalsqft) AS avgSqft FROM rentalproperty
      UNION ALL
      SELECT AVG(holdingsqft) AS avgSqft FROM holdingproperty
      UNION ALL
      SELECT AVG(developmentsqft) AS avgSqft FROM developmentproperty
    ) AS combinedAverages`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error executing MySQL query: ", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }
    const overallAvgSqft = result[0].overallAvgSqft;
    res.json({ overallAvgSqft });
  });
});

app.get("/rentalproperties/count", (req, res) => {
  const sql = "SELECT COUNT(*) AS totalProperties FROM rentalproperty"; // Assuming your table name is 'rental_properties'
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error executing MySQL query: ", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }
    const totalProperties = result[0].totalProperties;
    res.json({ totalProperties });
  });
});

const memberstorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "memberprofile/";
    // Create the 'memberprofile' folder if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
    // Set the file name to be unique using the current timestamp
  },
});

const memberupload = multer({ storage: memberstorage });

// Route to handle adding members
app.post("/addmember", memberupload.single("profilepicture"), (req, res) => {
  const requestData = req.body;
  const profilePicturePath = req.file.path; // Multer adds the file information to the request object
  const sql =
    "INSERT INTO addmember (membername, password, email, role, permission, profilepicture, roledescription) VALUES (?, ?, ?, ?, ?, ?, ?)";
  db.query(
    sql,
    [
      requestData.membername,
      requestData.password,
      requestData.email,
      requestData.role,
      requestData.permission,
      profilePicturePath, // Use the file path here
      requestData.roledescription,
    ],
    (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res
          .status(500)
          .json({ error: "Internal Server Error", message: err.message });
      } else {
        console.log("Data inserted successfully");
        return res.status(200).json({ message: "Data inserted successfully" });
      }
    }
  );
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "administratorprofile/";
    // Create the 'uploads' folder if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
    // Set the file name to be unique using the current timestamp
  },
});

const upload = multer({ storage });

app.post("/addadministrator", upload.single("profilepicture"), (req, res) => {
  const requestData = req.body;
  const profilePicturePath = req.file ? req.file.path : null;
  const sql =
    "INSERT INTO administrators (name, email, password, profilepicture) VALUES (?, ?, ?, ?)";
  db.query(
    sql,
    [
      requestData.name,
      requestData.email,
      requestData.password,
      profilePicturePath,
    ],
    (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res
          .status(500)
          .json({ error: "Internal Server Error", message: err.message });
      } else {
        console.log("Data inserted successfully");
        return res
          .status(200)
          .json({ message: "Administrator added successfully" });
      }
    }
  );
});

app.get("/investorinvestment/:investorId", (req, res) => {
  const investorId = req.params.investorId;

  const investmentSql = `
    SELECT *
    FROM investments
    WHERE investor_id = ?
  `;

  const holdingInvestmentSql = `
    SELECT *
    FROM holdinginvestment
    WHERE investor_id = ?
  `;

  const developmentInvestmentSql = `
    SELECT *
    FROM developmentinvestment
    WHERE investor_id = ?
  `;

  db.query(investmentSql, [investorId], (err, investmentResults) => {
    if (err) {
      console.error("Error fetching investment data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }

    db.query(
      holdingInvestmentSql,
      [investorId],
      (err, holdingInvestmentResults) => {
        if (err) {
          console.error("Error fetching holding investment data:", err);
          return res
            .status(500)
            .json({ error: "Internal Server Error", message: err.message });
        }

        db.query(
          developmentInvestmentSql,
          [investorId],
          (err, developmentInvestmentResults) => {
            if (err) {
              console.error("Error fetching development investment data:", err);
              return res
                .status(500)
                .json({ error: "Internal Server Error", message: err.message });
            }

            return res.status(200).json({
              investment: investmentResults,
              holdingInvestment: holdingInvestmentResults,
              developmentInvestment: developmentInvestmentResults,
            });
          }
        );
      }
    );
  });
});

app.get("/investorsinvestmentsdetails", (req, res) => {
  const rentalPropertyIds = req.query.rentalPropertyIds
    ? req.query.rentalPropertyIds.split(",").map(Number)
    : [];
  const developmentPropertyIds = req.query.developmentPropertyIds
    ? req.query.developmentPropertyIds.split(",").map(Number)
    : [];
  const holdingPropertyIds = req.query.holdingPropertyIds
    ? req.query.holdingPropertyIds.split(",").map(Number)
    : [];

  const results = {};

  async function fetchProperties(propertyType, ids) {
    if (ids.length === 0) return;

    let query;
    switch (propertyType) {
      case "rental":
        query = `
          SELECT *
          FROM rentalproperty
          WHERE id IN (?)
        `;
        break;
      case "development":
        query = `
          SELECT *
          FROM developmentproperty
          WHERE id IN (?)
        `;
        break;
      case "holding":
        query = `
          SELECT *
          FROM holdingproperty
          WHERE id IN (?)
        `;
        break;
      default:
        throw new Error(`Invalid property type: ${propertyType}`);
    }

    return new Promise((resolve, reject) => {
      db.query(query, [ids], (err, data) => {
        if (err) return reject(err);
        results[propertyType] = data;
        resolve();
      });
    });
  }
  Promise.all([
    fetchProperties("rental", rentalPropertyIds),
    fetchProperties("development", developmentPropertyIds),
    fetchProperties("holding", holdingPropertyIds),
  ])
    .then(() => {
      res.status(200).json(results);
    })
    .catch((err) => {
      console.error("Error fetching properties:", err);
      res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Check if email or password is missing
  if (!email || !password) {
    return res
      .status(400)
      .json({
        error: "Bad Request",
        message: "Email and password are required",
      });
  }
  const sql = "SELECT * FROM administrators WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }
    if (results.length === 0) {
      console.log("Email not found");
      return res
        .status(401)
        .json({ error: "Unauthorized", message: "Invalid email or password" });
    }
    const administrator = results[0];
    // Check if the password matches
    if (administrator.password !== password) {
      console.log("Invalid password");
      return res
        .status(401)
        .json({ error: "Unauthorized", message: "Invalid email or password" });
    }
    // Generate JWT token
    const token = jwt.sign(
      { email: administrator.email, id: administrator.id },
      "your-secret-key",
      { expiresIn: "1h" }
    );
    console.log("Login successful");
    // Return token and administrator data
    return res.status(200).json({
      administrator: {
        id: administrator.id,
        email: administrator.email,
        name: administrator.name,
        token: token,
        // Add other administrator data fields here
      },
    });
  });
});
app.post("/logininvestor", (req, res) => {
  const { email, password } = req.body;
  const investorQuery =
    "SELECT * FROM investors WHERE email = ? AND investorpassword = ?";
  const memberQuery =
    "SELECT * FROM addmember WHERE email = ? AND password = ?";
  // First, check in the 'investors' table
  db.query(investorQuery, [email, password], (investorErr, investorResults) => {
    if (investorErr) {
      console.error("Error querying investor table:", investorErr);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: investorErr.message });
    }
    console.log(investorResults);
    
    if (investorResults.length > 0) {
      // Check if the investor status is enabled
      if (investorResults[investorResults.length - 1].status === "enabled") {
        // Generate JWT token for investor
        const investorData = investorResults[investorResults.length - 1];
        const token = jwt.sign(
          { email: investorData.email, id: investorData.id },
          "your-secret-key",
          { expiresIn: "1h" }
        );

        console.log("Investor login successful");

        // Return investor data
        return res.status(200).json({
          investor: {
            id: investorData.id,
            email: investorData.email,
            name: investorData.investorname,
            profilepicture: investorData.profilepicture,
            token: token,
            // Additional fields
            address: investorData.address,
            investorcategory: investorData.investorcategory,
            mobilenumber: investorData.mobilenumber,
            officeaddress: investorData.officeaddress,
            documenttype: investorData.documenttype,
            notes: investorData.notes,
            documentnumber: investorData.documentnumber,
            issuingauthority: investorData.issuingauthority,
            expirydate: investorData.expirydate,
            ntn: investorData.ntn,
            cnicpicture: investorData.cnicpicture,
            nationality: investorData.nationality,
            status: investorData.status,
          },
        });
      } else {
        // If investor status is not enabled
        console.log("Investor status is disabled");
        return res
          .status(401)
          .json({
            error: "Unauthorized",
            message: "Investor status is disabled",
          });
      }
    } else {
      // If not found in 'investors' table, check in the 'addmember' table
      db.query(memberQuery, [email, password], (memberErr, memberResults) => {
        if (memberErr) {
          console.error("Error querying addmember table:", memberErr);
          return res
            .status(500)
            .json({
              error: "Internal Server Error",
              message: memberErr.message,
            });
        }

        if (memberResults.length > 0) {
          // Return member data
          const memberData = memberResults[0];
          console.log("Member login successful");
          return res.status(200).json({
            member: {
              name: memberData.membername,
              email: memberData.email,
              role: memberData.role,
              permission: memberData.permission,
              profilepicture: memberData.profilepicture,
              roledescription: memberData.roledescription,
              token: null, // No token for members
            },
          });
        } else {
          // Neither in 'investors' nor in 'addmember' table
          console.log("Invalid email or password");
          return res
            .status(401)
            .json({
              error: "Unauthorized",
              message: "Invalid email or password",
            });
        }
      });
    }
  });
});

const addinvestor = multer.diskStorage({ destination: function (req, file, cb) {
    const destinationFolder = "addinvestor";
    if (!fs.existsSync(destinationFolder)) {
      fs.mkdirSync(destinationFolder);
    }
    cb(null, destinationFolder);
  }, filename: function (req, file, cb) {
    cb(null, file.originalname); // Save file with its original name
  },
});
const investor = multer({
  storage: addinvestor,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
});
app.post("/addinvestor", investor.fields([
  { name: "cnicpicture", maxCount: 3 },
  { name: "profilepicture", maxCount: 1 },
]), (req, res) => {
  const requestData = req.body;

  // Get paths of all CNIC pictures and the profile picture
  const cnicPictures = req.files["cnicpicture"].map((file) => file.path);
  const profilePicture = req.files["profilepicture"][0].path;

  // SQL query to insert investor data
  const sql = `
    INSERT INTO investors (investorname, address, email, investorcategory, mobilenumber, officeaddress, documenttype, notes, documentnumber, issuingauthority, expirydate, ntn, cnicpicture, profilepicture, nationality, investorpassword)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  // Join CNIC picture paths into a string
  const cnicPicturePaths = cnicPictures.join(",");

  // Execute SQL query
  db.query(sql, [
    requestData.investorname,
    requestData.address,
    requestData.email,
    requestData.investorcategory,
    requestData.mobilenumber,
    requestData.officeaddress,
    requestData.documenttype,
    requestData.notes,
    requestData.documentnumber,
    requestData.issuingauthority,
    requestData.expirydate,
    requestData.ntn,
    cnicPicturePaths,
    profilePicture,
    requestData.nationality,
    requestData.investorpassword,
  ], (err, result) => {
    if (err) {
      console.error("Error inserting data:", err);
      return res.status(500).json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Data inserted successfully");
      // Send confirmation email
      const mailOptions = {
        from: 'send.sufiyan@gmail.com', // Sender address
        to: requestData.email, // List of recipients
        subject: 'Registration Successful', // Subject line
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; background-color: #f4f4f4; border-radius: 5px;">
            <h1 style="color: #333; text-align: center;">Welcome to Square1mall!</h1>
            <img src="cid:logo" alt="Square1mall Logo" style="display: block; margin: 0 auto; width: 150px;"/>
            <p style="color: #555; font-size: 16px;">Thank you for registering as an investor. We are excited to have you on board!</p>
            <p style="color: #555; font-size: 16px;">For more information, visit our website:</p>
            <p style="text-align: center;">
              <a href="http://localhost:8888" style="padding: 10px 20px; background-color: #880808 ; color: white; text-decoration: none; border-radius: 5px;">Visit Square1mall</a>
            </p>
            <p style="color: #555; font-size: 16px;">Best Regards,<br>One Capital Investment</p>
          </div>
        `, // HTML body with styles
        attachments: [
          {
            filename: 'logo.png',
            path: './logo.png', // Change this to the actual path of your logo file
            cid: 'logo' // Content ID used in the HTML to reference the image
          }
        ]
      };

      // Send email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
          return res.status(500).json({ error: "Failed to send confirmation email", message: error.message });
        } else {
          console.log("Confirmation email sent:", info.response);
          return res.status(200).json({ message: "Data inserted successfully and confirmation email sent" });
        }
      });
    }
  });
});
// Query to check if the trigger already exists
const checkTriggerQuery = `
  SELECT trigger_name
  FROM information_schema.triggers
  WHERE trigger_name = 'new_investor_notification' AND event_object_table = 'investors';
`;
// Check if the trigger already exists
db.query(checkTriggerQuery, (err, rows) => {
  if (err) {
    console.error("Error checking trigger existence: ", err);
    // Handle the error appropriately
    return;
  }
  // If the trigger does not exist, create it
  if (rows.length === 0) {
    const createTriggerQuery = `
      CREATE TRIGGER new_investor_notification AFTER INSERT ON investors
      FOR EACH ROW
      BEGIN
          INSERT INTO notification (investorName, profilepicture) VALUES (NEW.investorName, NEW.profilepicture);
      END;
    `;
    // Apply the trigger
    db.query(createTriggerQuery, (err, result) => {
      if (err) {
        console.error("Error creating trigger: ", err);
        // Handle trigger creation error gracefully
        return;
      }
      console.log("Trigger created successfully");
    });
  } else {
    console.log("Trigger already exists");
  }
});

app.get("/notifications", (req, res) => {
  const sql = "SELECT * FROM notification ORDER BY created_at DESC"; // Retrieve notifications ordered by created_at descending
  db.query(sql, (err, notifications) => {
    if (err) {
      console.error("Error fetching notifications: ", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }
    res.json({ notifications });
  });
});

app.get("/residentialpropertycount", (req, res) => {
  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM developmentproperty WHERE typeofproperty = 'Residential') AS count_from_development,
      (SELECT COUNT(*) FROM rentalproperty WHERE typeofproperty = 'Residential') AS count_from_rental
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching residential property count: ", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }
    // Extract counts from results
    const countFromDevelopment = results[0].count_from_development;
    const countFromRental = results[0].count_from_rental;
    // Calculate total count
    const totalCount = countFromDevelopment + countFromRental;
    res.json({ totalresidentialpropertycount: totalCount });
  });
});
const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
app.get("/newinvestors", (req, res) => {
  // Query to count new investors created today
  const sql = `SELECT COUNT(*) AS newinvestorscount FROM investors WHERE DATE(created_at) = '${today}'`;
  // Execute the SQL query
  db.query(sql, (err, result) => {
    if (err) {
      // If there's an error, handle it
      console.error("Error fetching new investors count: ", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }
    // If successful, return the count of new investors
    const newInvestorsCount = result[0].newinvestorscount;
    res.json({ newinvestorscount: newInvestorsCount });
  });
});
// Define a GET API endpoint to retrieve investor data
app.get("/allinvestors", (req, res) => {
  const sql = "SELECT * FROM investors WHERE status = ?"; // Add a WHERE clause to filter by status
  // Assuming 'enabled' is the status value for enabled investors
  const status = "enabled";
  db.query(sql, [status], (err, result) => {
    if (err) {
      console.error("Error fetching investors:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      return res.status(200).json({ data: result });
    }
  });
});
app.get("/disableinvestor", (req, res) => {
  const sql = "SELECT * FROM investors WHERE status = ?"; // Add a WHERE clause to filter by status

  // Assuming 'enabled' is the status value for enabled investors
  const status = "disabled";

  db.query(sql, [status], (err, result) => {
    if (err) {
      console.error("Error fetching investors:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      return res.status(200).json({ data: result });
    }
  });
});
app.get("/disabledinvestorscount", (req, res) => {
  const sql =
    "SELECT COUNT(*) AS disabledCount FROM investors WHERE status = ?"; // Count the number of disabled investors

  // Assuming 'disabled' is the status value for disabled investors
  const status = "disabled";

  db.query(sql, [status], (err, result) => {
    if (err) {
      console.error("Error counting disabled investors:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      // Extract the count from the result
      const disabledCount = result[0].disabledCount;
      return res.status(200).json({ disabledCount });
    }
  });
});
app.get("/alladministrators", (req, res) => {
  const sql = "SELECT * FROM administrators";

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching administrators:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      return res.status(200).json({ data: result });
    }
  });
});
app.get("/allmembers", (req, res) => {
  const sql = "SELECT * FROM addmember";

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching members:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      return res.status(200).json({ data: result });
    }
  });
});

app.get("/checkdb", (req, res) => {
  db.query("SELECT 1", (err, result) => {
    if (err) {
      console.error("Error checking database connection:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Database connection is successful");
      return res
        .status(200)
        .json({ message: "Database connection is successful" });
    }
  });
});

app.delete("/deletemember/:id", (req, res) => {
  const id = req.params.id;

  const sql = "DELETE FROM addmember WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (result.affectedRows > 0) {
        console.log("Data deleted successfully");
        return res.status(200).json({ message: "Data deleted successfully" });
      } else {
        console.log("No data found for the given id");
        return res
          .status(404)
          .json({ message: "No data found for the given id" });
      }
    }
  });
});

app.delete("/deleterentaltransaction/:id", (req, res) => {
  const id = req.params.id;

  const sql = "DELETE FROM rentaltransaction WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting rental transaction:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (result.affectedRows > 0) {
        console.log("Rental transaction deleted successfully");
        return res
          .status(200)
          .json({ message: "Rental transaction deleted successfully" });
      } else {
        console.log("No rental transaction found for the given id");
        return res
          .status(404)
          .json({ message: "No rental transaction found for the given id" });
      }
    }
  });
});

app.delete("/deletedevelopmenttransaction/:id", (req, res) => {
  const id = req.params.id;

  const sql = "DELETE FROM developmenttransaction WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting development transaction:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (result.affectedRows > 0) {
        console.log("Development transaction deleted successfully");
        return res
          .status(200)
          .json({ message: "Revelopment transaction deleted successfully" });
      } else {
        console.log("No development transaction found for the given id");
        return res
          .status(404)
          .json({
            message: "No development transaction found for the given id",
          });
      }
    }
  });
});

app.delete("/deleteholdingtransaction/:id", (req, res) => {
  const id = req.params.id;

  const sql = "DELETE FROM holdingtransaction WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting holding transaction:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (result.affectedRows > 0) {
        console.log("Holding transaction deleted successfully");
        return res
          .status(200)
          .json({ message: "Holding transaction deleted successfully" });
      } else {
        console.log("No holding transaction found for the given id");
        return res
          .status(404)
          .json({ message: "No holding transaction found for the given id" });
      }
    }
  });
});

app.get("/getdevelopmenttransactions", (req, res) => {
  const { investorId, investmentId } = req.query;
  if (!investorId) {
    return res
      .status(400)
      .json({ error: "Bad Request", message: "Investor ID is required" });
  }
  const sql = `
    SELECT *
    FROM developmenttransaction
    WHERE investor_id = ? ${investmentId ? "AND investment_id = ?" : ""}`;
  const params = investmentId ? [investorId, investmentId] : [investorId];
  db.query(sql, params, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }
    if (result.length === 0) {
      console.log("No development transactions found for this investor");
      return res
        .status(404)
        .json({
          message: "No development transactions found for this investor",
        });
    }
    return res.status(200).json({ transactions: result });
  });
});

app.get("/holdingtransactions", (req, res) => {
  const investorId = req.query.investor_id;
  const investmentId = req.query.investment_id;
  if (!investorId && !investmentId) {
    return res
      .status(400)
      .json({
        error: "Bad Request",
        message: "Either investor_id or investment_id must be provided",
      });
  }
  let sql = `SELECT * FROM holdingtransaction WHERE 1=1`;
  if (investorId) sql += ` AND investor_id = '${investorId}'`;
  if (investmentId) sql += ` AND investment_id = '${investmentId}'`;
  db.query(sql, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (result.length > 0) {
        return res.status(200).json({ transactions: result });
      } else {
        console.log("No holding transactions found");
        return res
          .status(404)
          .json({ message: "No holding transactions found" });
      }
    }
  });
});

app.get("/getinvestortransactions", (req, res) => {
  const { type, investor_id, investment_id } = req.query;
    console.log("TYPE: ", type);
    console.log("INVESTOR ID: ", investor_id);
    console.log("INVESTMENT ID: ", investment_id);
    
  if (!type || !investor_id || !investment_id) {
    return res
      .status(400)
      .json({
        error: "Bad Request",
        message: "Type, investor_id, and investment_id are required parameters",
      });
  }

  const tableName = (`${type}transaction`).toLocaleLowerCase();
  console.log("Table Name: ", tableName);
  

  const sql = `SELECT * FROM ${tableName} WHERE investor_id = ? AND investment_id = ?`;

  db.query(sql, [investor_id, investment_id], (err, result) => {
    console.log("Transactions: ", result);
    
    if (err) {
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }
    if (result.length === 0) {
      return res
        .status(404)
        .json({
          error: "Not Found",
          message: "No transactions found for the provided criteria",
        });
    }
    return res.status(200).json({ transactions: result });
  });
});

app.get("/getallinvestortransactions", async (req, res) => {
  const { investor_id } = req.query;

  if (!investor_id) {
    return res
      .status(400)
      .json({
        error: "Bad Request",
        message: "investor_id is a required parameter",
      });
  }

  const sqlRental = `
    SELECT rt.*, rp.* FROM rentaltransaction rt
    JOIN rentalproperty rp ON rt.property_id = rp.id
    WHERE rt.investor_id = ?
  `;

  const sqlDevelopment = `
    SELECT dt.*, dp.* FROM developmenttransaction dt
    JOIN developmentproperty dp ON dt.property_id = dp.id
    WHERE dt.investor_id = ?
  `;

  const sqlHolding = `
    SELECT ht.*, hp.* FROM holdingtransaction ht
    JOIN holdingproperty hp ON ht.holdingproperty_id = hp.id
    WHERE ht.investor_id = ?
  `;

  try {
    const combinedResults = await getAllInvestorTransactions(
      investor_id,
      sqlRental,
      sqlDevelopment,
      sqlHolding
    );


    if (combinedResults.length === 0) {
      return res
        .status(404)
        .json({
          error: "Not Found",
          message: "No transactions found for the provided investor_id",
        });
    }

    return res.status(200).json({ transactions: combinedResults });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Internal Server Error", message: err.message });
  }
});
async function getAllInvestorTransactions(investor_id, sqlRental, sqlDevelopment, sqlHolding) {
  const [rentalResult, developmentResult, holdingResult] = await Promise.all([
    query(sqlRental, [investor_id]),
    query(sqlDevelopment, [investor_id]),
    query(sqlHolding, [investor_id]),
  ]);

  console.log("HOLDING TRANSACTIONS: ",holdingResult);
  return rentalResult.concat(developmentResult, holdingResult);
  
}
function query(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

const holdingstorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = "./holdingproperty";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// File filter function
const holdingfilter = (req, file, cb) => {
  if (file.fieldname === "landpictures" || file.fieldname === "propertylogo") {
    const allowedImageTypes = /jpeg|jpg|png|gif|bmp|svg|webp|tiff/;
    const extname = allowedImageTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedImageTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only JPEG, JPG, PNG, or GIF images are allowed for landpictures and propertylogo!"
        )
      );
    }
  } else if (
    file.fieldname === "financialdocument" ||
    file.fieldname === "legaldocument"
  ) {
    const allowedFileTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only PDF or DOCX files are allowed for financialdocument and legaldocument!"
        )
      );
    }
  } else {
    cb(new Error("Error: Unsupported fieldname!"));
  }
};

// Multer upload initialization
const holdingupload = multer({
  storage: holdingstorage,
  fileFilter: holdingfilter,
  limits: { fileSize: 10000000 }, // Set a limit for the file size if needed
}).fields([
  { name: "landpictures", maxCount: 80 }, // Allow up to 5 land pictures
  { name: "financialdocument", maxCount: 80 }, // Allow up to 5 financial documents
  { name: "legaldocument", maxCount: 80 }, // Allow up to 5 legal documents
  { name: "propertylogo", maxCount: 1 }, // Allow only 1 property logo
]);

// Route handler for '/holdingproperty' endpoint
app.post("/holdingproperty", (req, res) => {
  holdingupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;

      const sql = `
        INSERT INTO holdingproperty (
          propertyname,
          propertysize,
          propertycategory,
          location,
          propertyvalue,
          typeofproperty,
          landpictures,
          financialdocument,
          legaldocument,
          propertylogo,
          description,
          status,
          numberofunits,
          holdingsqft
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?)`;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.propertysize,
          requestData.propertycategory,
          requestData.location,
          requestData.propertyvalue,
          requestData.typeofproperty,
          req.files["landpictures"]
            ? req.files["landpictures"].map((file) => file.path).join(",")
            : null,
          req.files["financialdocument"]
            ? req.files["financialdocument"].map((file) => file.path).join(",")
            : null,
          req.files["legaldocument"]
            ? req.files["legaldocument"].map((file) => file.path).join(",")
            : null,
          req.files["propertylogo"] ? req.files["propertylogo"][0].path : null,
          requestData.description,
          requestData.status,
          requestData.numberofunits,
          requestData.holdingsqft,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data inserted successfully");
            return res
              .status(200)
              .json({ message: "Property added successfully" });
          }
        }
      );
    }
  });
});
const workholdingstorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = "./workholdingproperty";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
// File filter function
const workholdingfilter = (req, file, cb) => {
  if (file.fieldname === "landpictures" || file.fieldname === "propertylogo") {
    const allowedImageTypes = /jpeg|jpg|png|gif|bmp|svg|webp|tiff/;
    const extname = allowedImageTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedImageTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only JPEG, JPG, PNG, or GIF images are allowed for landpictures and propertylogo!"
        )
      );
    }
  } else if (
    file.fieldname === "financialdocument" ||
    file.fieldname === "legaldocument"
  ) {
    const allowedFileTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only PDF or DOCX files are allowed for financialdocument and legaldocument!"
        )
      );
    }
  } else {
    cb(new Error("Error: Unsupported fieldname!"));
  }
};

// Multer upload initialization
const workholdingupload = multer({
  storage: workholdingstorage,
  fileFilter: workholdingfilter,
  limits: { fileSize: 10000000 }, // Set a limit for the file size if needed
}).fields([
  { name: "landpictures", maxCount: 80 }, // Allow up to 5 land pictures
  { name: "financialdocument", maxCount: 80 }, // Allow up to 5 financial documents
  { name: "legaldocument", maxCount: 80 }, // Allow up to 5 legal documents
  { name: "propertylogo", maxCount: 1 }, // Allow only 1 property logo
]);

// Route handler for '/holdingproperty' endpoint
app.post("/workholdingproperty", (req, res) => {
  workholdingupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;

      const sql = `
        INSERT INTO workholdingproperty (
          propertyname,
          propertysize,
          propertycategory,
          location,
          propertyvalue,
          typeofproperty,
          landpictures,
          financialdocument,
          legaldocument,
          propertylogo,
          description,
          status,
          numberofunits,
          holdingsqft
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?)`;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.propertysize,
          requestData.propertycategory,
          requestData.location,
          requestData.propertyvalue,
          requestData.typeofproperty,
          req.files["landpictures"]
            ? req.files["landpictures"].map((file) => file.path).join(",")
            : null,
          req.files["financialdocument"]
            ? req.files["financialdocument"].map((file) => file.path).join(",")
            : null,
          req.files["legaldocument"]
            ? req.files["legaldocument"].map((file) => file.path).join(",")
            : null,
          req.files["propertylogo"] ? req.files["propertylogo"][0].path : null,
          requestData.description,
          requestData.status,
          requestData.numberofunits,
          requestData.holdingsqft,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data inserted successfully");
            return res
              .status(200)
              .json({ message: "Property added successfully" });
          }
        }
      );
    }
  });
});
// Route handler for updating workholding property data
app.put("/workholdingproperty/:propertyId", (req, res) => {
  const propertyId = req.params.propertyId;

  workholdingupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;
      const sql = `
        UPDATE workholdingproperty SET
          propertyname = ?,
          propertysize = ?,
          propertycategory = ?,
          location = ?,
          propertyvalue = ?,
          typeofproperty = ?,
          landpictures = ?,
          financialdocument = ?,
          legaldocument = ?,
          propertylogo = ?,
          description = ?,
          status = ?,
          numberofunits = ?,
          holdingsqft = ?
        WHERE id = ?`;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.propertysize,
          requestData.propertycategory,
          requestData.location,
          requestData.propertyvalue,
          requestData.typeofproperty,
          req.files["landpictures"]
            ? req.files["landpictures"].map((file) => file.path).join(",")
            : null,
          req.files["financialdocument"]
            ? req.files["financialdocument"].map((file) => file.path).join(",")
            : null,
          req.files["legaldocument"]
            ? req.files["legaldocument"].map((file) => file.path).join(",")
            : null,
          req.files["propertylogo"] ? req.files["propertylogo"][0].path : null,
          requestData.description,
          requestData.status,
          requestData.numberofunits,
          requestData.holdingsqft,
          propertyId,
        ],
        (err, result) => {
          if (err) {
            console.error("Error updating data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data updated successfully");
            return res
              .status(200)
              .json({ message: "Property updated successfully" });
          }
        }
      );
    }
  });
});

app.put("/holdingproperty/:id", (req, res) => {
  const holdingId = req.params.id;
  holdingupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;
      const sql = `
        UPDATE holdingproperty
        SET
          propertyname = ?,
          propertysize = ?,
          propertycategory = ?,
          location = ?,
          propertyvalue = ?,
          typeofproperty = ?,
          landpictures = ?,
          financialdocument = ?,
          legaldocument = ?,
          propertylogo = ?,
          description = ?,
          status = ?,
          numberofunits = ?,
          holdingsqft = ?
        WHERE id = ?
      `;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.propertysize,
          requestData.propertycategory,
          requestData.location,
          requestData.propertyvalue,
          requestData.typeofproperty,
          req.files["landpictures"]
            ? req.files["landpictures"].map((file) => file.path).join(",")
            : null,
          req.files["financialdocument"]
            ? req.files["financialdocument"].map((file) => file.path).join(",")
            : null,
          req.files["legaldocument"]
            ? req.files["legaldocument"].map((file) => file.path).join(",")
            : null,
          req.files["propertylogo"] ? req.files["propertylogo"][0].path : null,
          requestData.description,
          requestData.status,
          requestData.numberofunits,
          requestData.holdingsqft,
          holdingId,
        ],
        (err, result) => {
          if (err) {
            console.error("Error updating data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data updated successfully");
            return res
              .status(200)
              .json({ message: "Holding Property updated successfully" });
          }
        }
      );
    }
  });
});

app.get("/getholdingproperty", (req, res) => {
  const sql = `
    SELECT *
    FROM holdingproperty
    WHERE propertystatus = 'enabled'`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Data fetched successfully");
      return res.status(200).json(result);
    }
  });
});
app.get("/getholdingproperty/:id", (req, res) => {
  const propertyId = req.params.id;
  const sql = `
    SELECT *
    FROM holdingproperty
    WHERE propertystatus = 'enabled' AND id = ?`;
  db.query(sql, propertyId, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (result.length === 0) {
        // If no property found with the given ID
        return res
          .status(404)
          .json({ error: "Not Found", message: "Holding property not found" });
      }
      console.log("Holding property data fetched successfully");
      return res.status(200).json(result[0]); // Assuming ID is unique, returning the first result
    }
  });
});
app.get("/counttotalworkproperties", (req, res) => {
  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM workdevelopmentproperty WHERE propertystatus = 'enabled') AS developmentCount,
      (SELECT COUNT(*) FROM workholdingproperty WHERE propertystatus = 'enabled') AS holdingCount,
      (SELECT COUNT(*) FROM workrentalproperty WHERE propertystatus = 'enabled') AS rentalCount`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Counts fetched successfully");
      const totalCount = {
        developmentCount: result[0].developmentCount,
        holdingCount: result[0].holdingCount,
        rentalCount: result[0].rentalCount,
        totalCount:
          result[0].developmentCount +
          result[0].holdingCount +
          result[0].rentalCount,
      };
      return res.status(200).json(totalCount);
    }
  });
});

app.get("/getworkholdingproperty", (req, res) => {
  const sql = `
    SELECT *
    FROM workholdingproperty`;
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Data fetched successfully");
      return res.status(200).json(result);
    }
  });
});

app.get("/getworkholdingproperty/:id", (req, res) => {
  const propertyId = req.params.id;
  const sql = `
    SELECT *
    FROM workholdingproperty
    WHERE id = ?`;

  db.query(sql, propertyId, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (result.length === 0) {
        // If no property found with the given ID
        return res
          .status(404)
          .json({
            error: "Not Found",
            message: "Work holding property not found",
          });
      }
      console.log("Work holding property data fetched successfully");
      return res.status(200).json(result[0]); // Assuming ID is unique, returning the first result
    }
  });
});
const rentalstorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = "./rentalproperty";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
    // cb(null, Date.now() + path.extname(file.originalname));
  },
});

// File filter
const rentalfilter = (req, file, cb) => {
  if (file.fieldname === "landpictures" || file.fieldname === "propertylogo") {
    const allowedImageTypes = /jpeg|jpg|png|gif|bmp|svg|webp|tiff/;
    const extname = allowedImageTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedImageTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only JPEG, JPG, PNG, or GIF images are allowed for landpictures and propertylogo!"
        )
      );
    }
  } else if (
    file.fieldname === "financialdocument" ||
    file.fieldname === "legaldocument"
  ) {
    const allowedFileTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only PDF or DOCX files are allowed for financialdocument and legaldocument!"
        )
      );
    }
  } else {
    cb(new Error("Error: Unsupported fieldname!"));
  }
};

// Multer upload initialization
const rentalupload = multer({
  storage: rentalstorage,
  fileFilter: rentalfilter,
  limits: { fileSize: 10000000 }, // Set a limit for the file size if needed
}).fields([
  { name: "landpictures", maxCount: 80 }, // Allow up to 5 land pictures
  { name: "financialdocument", maxCount: 80 }, // Allow up to 5 financial documents
  { name: "legaldocument", maxCount: 80 },
  { name: "propertylogo", maxCount: 1 }, //
]);

// Route handler for '/holdingproperty' endpoint
app.post("/rentalproperty", (req, res) => {
  rentalupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;
      const sql = `
    INSERT INTO rentalproperty (
      propertyname,
      propertysize,
      typeofproperty,
      location,
      leaseterms,
      status,
      rentalsqft,
      tenantcategory,
      landpictures,
      description,
      financialdocument,
      legaldocument,
      propertylogo,
      propertyvalue,
      numberofunits
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.propertysize,
          requestData.typeofrentalproperty,
          requestData.location,
          requestData.leaseterms,
          requestData.status,
          requestData.rentalsqft,
          requestData.tenantcategory,
          req.files["landpictures"]
            ? req.files["landpictures"].map((file) => file.path).join(",")
            : null,
          requestData.description,
          req.files["financialdocument"]
            ? req.files["financialdocument"].map((file) => file.path).join(",")
            : null,
          req.files["legaldocument"]
            ? req.files["legaldocument"].map((file) => file.path).join(",")
            : null,
          req.files["propertylogo"][0].path,
          requestData.propertyvalue,
          requestData.numberofunits,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data inserted successfully");
            return res
              .status(200)
              .json({ message: "Rental Property added successfully" });
          }
        }
      );
    }
  });
});

const workrentalstorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = "./workrentalproperty";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
    // cb(null, Date.now() + path.extname(file.originalname));
  },
});

// File filter
const workrentalfilter = (req, file, cb) => {
  if (file.fieldname === "landpictures" || file.fieldname === "propertylogo") {
    const allowedImageTypes = /jpeg|jpg|png|gif|bmp|svg|webp|tiff/;
    const extname = allowedImageTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedImageTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only JPEG, JPG, PNG, or GIF images are allowed for landpictures and propertylogo!"
        )
      );
    }
  } else if (
    file.fieldname === "financialdocument" ||
    file.fieldname === "legaldocument"
  ) {
    const allowedFileTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only PDF or DOCX files are allowed for financialdocument and legaldocument!"
        )
      );
    }
  } else {
    cb(new Error("Error: Unsupported fieldname!"));
  }
};

// Multer upload initialization
const workrentalupload = multer({
  storage: workrentalstorage,
  fileFilter: workrentalfilter,
  limits: { fileSize: 10000000 }, // Set a limit for the file size if needed
}).fields([
  { name: "landpictures", maxCount: 80 }, // Allow up to 5 land pictures
  { name: "financialdocument", maxCount: 80 }, // Allow up to 5 financial documents
  { name: "legaldocument", maxCount: 80 },
  { name: "propertylogo", maxCount: 1 }, //
]);

// Route handler for '/holdingproperty' endpoint
app.post("/workrentalproperty", (req, res) => {
  workrentalupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;

      const sql = `
    INSERT INTO workrentalproperty(
      propertyname,
      propertysize,
      typeofproperty,
      location,
      leaseterms,
      status,
      rentalsqft,
      tenantcategory,
      landpictures,
      description,
      financialdocument,
      legaldocument,
      propertylogo,
      propertyvalue,
      numberofunits
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.propertysize,
          requestData.typeofrentalproperty,
          requestData.location,
          requestData.leaseterms,
          requestData.status,
          requestData.rentalsqft,
          requestData.tenantcategory,
          req.files["landpictures"]
            ? req.files["landpictures"].map((file) => file.path).join(",")
            : null,
          requestData.description,
          req.files["financialdocument"]
            ? req.files["financialdocument"].map((file) => file.path).join(",")
            : null,
          req.files["legaldocument"]
            ? req.files["legaldocument"].map((file) => file.path).join(",")
            : null,
          req.files["propertylogo"][0].path,
          requestData.propertyvalue,
          requestData.numberofunits,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data inserted successfully");
            return res
              .status(200)
              .json({ message: "Rental Property added successfully" });
          }
        }
      );
    }
  });
});

// Route handler for updating a rental property
app.put("/workrentalproperty/:cardId", (req, res) => {
  const cardId = req.params.cardId;

  workrentalupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;

      const sql = `
        UPDATE workrentalproperty 
        SET 
          propertyname = ?,
          propertysize = ?,
          typeofproperty = ?,
          location = ?,
          leaseterms = ?,
          status = ?,
          rentalsqft = ?,
          tenantcategory = ?,
          landpictures = ?,
          description = ?,
          financialdocument = ?,
          legaldocument = ?,
          propertylogo = ?,
          propertyvalue = ?,
          numberofunits = ?
        WHERE id = ?`;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.propertysize,
          requestData.typeofrentalproperty,
          requestData.location,
          requestData.leaseterms,
          requestData.status,
          requestData.rentalsqft,
          requestData.tenantcategory,
          req.files["landpictures"]
            ? req.files["landpictures"].map((file) => file.path).join(",")
            : null,
          requestData.description,
          req.files["financialdocument"]
            ? req.files["financialdocument"].map((file) => file.path).join(",")
            : null,
          req.files["legaldocument"]
            ? req.files["legaldocument"].map((file) => file.path).join(",")
            : null,
          req.files["propertylogo"][0].path,
          requestData.propertyvalue,
          requestData.numberofunits,
          cardId,
        ],
        (err, result) => {
          if (err) {
            console.error("Error updating data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data updated successfully");
            return res
              .status(200)
              .json({ message: "Rental Property updated successfully" });
          }
        }
      );
    }
  });
});
app.put("/rentalproperty/:id", (req, res) => {
  const rentalId = req.params.id;

  rentalupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;

      const sql = `
        UPDATE rentalproperty
        SET
          propertyname = ?,
          propertysize = ?,
          typeofproperty = ?,
          location = ?,
          leaseterms = ?,
          status = ?,
          rentalsqft = ?,
          tenantcategory = ?,
          landpictures = ?,
          description = ?,
          financialdocument = ?,
          legaldocument = ?,
          propertylogo = ?,
          propertyvalue = ?,
          numberofunits = ?
        WHERE id = ?
      `;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.propertysize,
          requestData.typeofrentalproperty,
          requestData.location,
          requestData.leaseterms,
          requestData.status,
          requestData.rentalsqft,
          requestData.tenantcategory,
          req.files["landpictures"]
            ? req.files["landpictures"].map((file) => file.path).join(",")
            : null,
          requestData.description,
          req.files["financialdocument"]
            ? req.files["financialdocument"].map((file) => file.path).join(",")
            : null,
          req.files["legaldocument"]
            ? req.files["legaldocument"].map((file) => file.path).join(",")
            : null,
          req.files["propertylogo"][0].path,
          requestData.propertyvalue,
          requestData.numberofunits,
          rentalId,
        ],
        (err, result) => {
          if (err) {
            console.error("Error updating data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data updated successfully");
            return res
              .status(200)
              .json({ message: "Rental Property updated successfully" });
          }
        }
      );
    }
  });
});
app.get("/getrentalproperty", (req, res) => {
  const sql = `
    SELECT *
    FROM rentalproperty
    WHERE propertystatus = 'enabled'`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Rental property data fetched successfully");
      return res.status(200).json(result);
    }
  });
});
app.get("/getrentalproperty/:id", (req, res) => {
  // Extract ID from request parameters
  const id = req.params.id;

  // Prepare SQL query with parameterized ID
  const sql = `
    SELECT *
    FROM rentalproperty
    WHERE propertystatus = 'enabled'
    AND id = ?`;

  // Execute the query with the provided ID
  db.query(sql, id, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      // Check if any data was found for the given ID
      if (result.length === 0) {
        return res
          .status(404)
          .json({
            error: "Not Found",
            message: "Rental property with the specified ID not found",
          });
      }

      // Data found, return it
      console.log("Rental property data fetched successfully");
      return res.status(200).json(result[0]); // Assuming only one property is returned
    }
  });
});

app.get("/getworkrentalproperty", (req, res) => {
  const sql = `
    SELECT *
    FROM workrentalproperty  WHERE propertystatus = 'enabled'`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Rental property data fetched successfully");
      return res.status(200).json(result);
    }
  });
});

app.get("/getworkrentalproperty/:id", (req, res) => {
  const propertyId = req.params.id;
  const sql = `
    SELECT *
    FROM workrentalproperty
    WHERE propertystatus = 'enabled' AND id = ?`;

  db.query(sql, propertyId, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (result.length === 0) {
        // If no property found with the given ID
        return res
          .status(404)
          .json({
            error: "Not Found",
            message: "Work rental property not found",
          });
      }
      console.log("Work rental property data fetched successfully");
      return res.status(200).json(result[0]); // Assuming ID is unique, returning the first result
    }
  });
});

const developmentstorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = "./developmentproperty";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// File filter
const developmentfilter = (req, file, cb) => {
  if (file.fieldname === "landpictures" || file.fieldname === "propertylogo") {
    const allowedImageTypes = /jpeg|jpg|png|gif|bmp|svg|webp|tiff/;
    const extname = allowedImageTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedImageTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only JPEG, JPG, PNG, or GIF images are allowed for landpictures and propertylogo!"
        )
      );
    }
  } else if (
    file.fieldname === "financialdocument" ||
    file.fieldname === "legaldocument"
  ) {
    const allowedFileTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only PDF or DOCX files are allowed for financialdocument and legaldocument!"
        )
      );
    }
  } else {
    cb(new Error("Error: Unsupported fieldname!"));
  }
};

// Multer upload initialization
const developmentupload = multer({
  storage: developmentstorage,
  fileFilter: developmentfilter,
  limits: { fileSize: 10000000 }, // Set a limit for the file size if needed
}).fields([
  { name: "landpictures", maxCount: 80 },
  { name: "financialdocument", maxCount: 80 },
  { name: "legaldocument", maxCount: 80 },
  { name: "propertylogo", maxCount: 1 },
]);

// Route handler for '/holdingproperty' endpoint
app.post("/developmentproperty", (req, res) => {
  developmentupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;

      const sql = `
      INSERT INTO developmentproperty (
        propertyname,
        landsize,
        typeofproperty,
        location,
        expecteddate,
        status,
        landpictures,
        description,
        financialdocument,
        legaldocument,
        propertylogo,
        propertyvalue,
        numberofunits,
        developmentsqft


      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?)`;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.landsize,
          requestData.typeofdevelopmentproperty,
          requestData.location,
          requestData.expecteddate,
          requestData.status,
          req.files["landpictures"]
            ? req.files["landpictures"].map((file) => file.path).join(",")
            : null,
          requestData.description,
          req.files["financialdocument"]
            ? req.files["financialdocument"].map((file) => file.path).join(",")
            : null,
          req.files["legaldocument"]
            ? req.files["legaldocument"].map((file) => file.path).join(",")
            : null,
          req.files["propertylogo"][0].path,
          requestData.propertyvalue,
          requestData.numberofunits,
          requestData.developmentsqft,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data inserted successfully");
            return res
              .status(200)
              .json({ message: "Development Property added successfully" });
          }
        }
      );
    }
  });
});

const workdevelopmentstorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = "./workdevelopmentproperty";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// File filter
const workdevelopmentfilter = (req, file, cb) => {
  if (file.fieldname === "landpictures" || file.fieldname === "propertylogo") {
    const allowedImageTypes = /jpeg|jpg|png|gif|bmp|svg|webp|tiff/;
    const extname = allowedImageTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedImageTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only JPEG, JPG, PNG, or GIF images are allowed for landpictures and propertylogo!"
        )
      );
    }
  } else if (
    file.fieldname === "financialdocument" ||
    file.fieldname === "legaldocument"
  ) {
    const allowedFileTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only PDF or DOCX files are allowed for financialdocument and legaldocument!"
        )
      );
    }
  } else {
    cb(new Error("Error: Unsupported fieldname!"));
  }
};

// Multer upload initialization
const workdevelopmentupload = multer({
  storage: workdevelopmentstorage,
  fileFilter: workdevelopmentfilter,
  limits: { fileSize: 10000000 }, // Set a limit for the file size if needed
}).fields([
  { name: "landpictures", maxCount: 80 },
  { name: "financialdocument", maxCount: 80 },
  { name: "legaldocument", maxCount: 80 },
  { name: "propertylogo", maxCount: 1 },
]);

// Route handler for '/holdingproperty' endpoint
app.post("/workdevelopmentproperty", (req, res) => {
  workdevelopmentupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;

      const sql = `
      INSERT INTO workdevelopmentproperty(
        propertyname,
        landsize,
        typeofproperty,
        location,
        expecteddate,
        status,
        landpictures,
        description,
        financialdocument,
        legaldocument,
        propertylogo,
        propertyvalue,
        numberofunits,
        developmentsqft
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?)`;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.landsize,
          requestData.typeofdevelopmentproperty,
          requestData.location,
          requestData.expecteddate,
          requestData.status,
          req.files["landpictures"]
            ? req.files["landpictures"].map((file) => file.path).join(",")
            : null,
          requestData.description,
          req.files["financialdocument"]
            ? req.files["financialdocument"].map((file) => file.path).join(",")
            : null,
          req.files["legaldocument"]
            ? req.files["legaldocument"].map((file) => file.path).join(",")
            : null,
          req.files["propertylogo"][0].path,
          requestData.propertyvalue,
          requestData.numberofunits,
          requestData.developmentsqft,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data inserted successfully");
            return res
              .status(200)
              .json({ message: "Development Property added successfully" });
          }
        }
      );
    }
  });
});

// Route handler for updating work development property by ID
app.put("/workdevelopmentproperty/:id", (req, res) => {
  const workDevelopmentId = req.params.id;
  workdevelopmentupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;

      const sql = `
      UPDATE workdevelopmentproperty SET
        propertyname = ?,
        landsize = ?,
        typeofproperty = ?,
        location = ?,
        expecteddate = ?,
        status = ?,
        landpictures = ?,
        description = ?,
        financialdocument = ?,
        legaldocument = ?,
        propertylogo = ?,
        propertyvalue = ?,
        numberofunits = ?,
        developmentsqft = ?
       WHERE id = ?`;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.landsize,
          requestData.typeofdevelopmentproperty,
          requestData.location,
          requestData.expecteddate,
          requestData.status,
          req.files["landpictures"]
            ? req.files["landpictures"].map((file) => file.path).join(",")
            : null,
          requestData.description,
          req.files["financialdocument"]
            ? req.files["financialdocument"].map((file) => file.path).join(",")
            : null,
          req.files["legaldocument"]
            ? req.files["legaldocument"].map((file) => file.path).join(",")
            : null,
          req.files["propertylogo"][0].path,
          requestData.propertyvalue,
          requestData.numberofunits,
          requestData.developmentsqft,
          workDevelopmentId,
        ],
        (err, result) => {
          if (err) {
            console.error("Error updating data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data updated successfully");
            return res
              .status(200)
              .json({
                message: "Work Development Property updated successfully",
              });
          }
        }
      );
    }
  });
});

app.put("/developmentproperty/:id", (req, res) => {
  const developmentId = req.params.id;

  developmentupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;

      const sql = `
        UPDATE developmentproperty
        SET
          propertyname = ?,
          landsize = ?,
          typeofproperty = ?,
          location = ?,
          expecteddate = ?,
          status = ?,
          landpictures = ?,
          description = ?,
          financialdocument = ?,
          legaldocument = ?,
          propertylogo = ?,
          propertyvalue = ?,
          numberofunits = ?,
          developmentsqft = ?
        WHERE id = ?
      `;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.landsize,
          requestData.typeofdevelopmentproperty,
          requestData.location,
          requestData.expecteddate,
          requestData.status,
          req.files["landpictures"]
            ? req.files["landpictures"].map((file) => file.path).join(",")
            : null,
          requestData.description,
          req.files["financialdocument"]
            ? req.files["financialdocument"].map((file) => file.path).join(",")
            : null,
          req.files["legaldocument"]
            ? req.files["legaldocument"].map((file) => file.path).join(",")
            : null,
          req.files["propertylogo"][0].path,
          requestData.propertyvalue,
          requestData.numberofunits,
          requestData.developmentsqft,
          developmentId,
        ],
        (err, result) => {
          if (err) {
            console.error("Error updating data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data updated successfully");
            return res
              .status(200)
              .json({ message: "Development Property updated successfully" });
          }
        }
      );
    }
  });
});

app.get("/getdevelopmentproperty", (req, res) => {
  const sql = `
    SELECT *
    FROM developmentproperty
    WHERE propertystatus = 'enabled'`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Development property data fetched successfully");
      return res.status(200).json(result);
    }
  });
});

app.get("/getworkdevelopmentproperty", (req, res) => {
  const sql = `
    SELECT *
    FROM workdevelopmentproperty
    WHERE propertystatus = 'enabled'`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Rental property data fetched successfully");
      return res.status(200).json(result);
    }
  });
});

app.get("/getworkdevelopmentproperty/:id", (req, res) => {
  const propertyId = req.params.id;
  const sql = `
    SELECT *
    FROM workdevelopmentproperty
    WHERE propertystatus = 'enabled' AND id = ?`;

  db.query(sql, propertyId, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (result.length === 0) {
        // If no property found with the given ID
        return res
          .status(404)
          .json({
            error: "Not Found",
            message: "Work development property not found",
          });
      }
      console.log("Work development property data fetched successfully");
      return res.status(200).json(result[0]); // Assuming ID is unique, returning the first result
    }
  });
});

app.get("/getdevelopmentproperty/:id", (req, res) => {
  const propertyId = req.params.id;
  const sql = `
    SELECT *
    FROM developmentproperty
    WHERE propertystatus = 'enabled' AND id = ?`;

  db.query(sql, propertyId, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (result.length === 0) {
        // If no property found with the given ID
        return res
          .status(404)
          .json({
            error: "Not Found",
            message: "Development property not found",
          });
      }
      console.log("Development property data fetched successfully");
      return res.status(200).json(result[0]); // Assuming ID is unique, returning the first result
    }
  });
});

app.get("/checkdevelopmentpropertyname", (req, res) => {
  const sql = `
    SELECT propertyname
    FROM developmentproperty`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Development property data fetched successfully");
      return res.status(200).json(result);
    }
  });
});

app.get("/checkworkdevelopmentpropertyname", (req, res) => {
  const sql = `
    SELECT propertyname
    FROM workdevelopmentproperty`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Development property data fetched successfully");
      return res.status(200).json(result);
    }
  });
});

app.get("/checkholdingpropertyname", (req, res) => {
  const sql = `
    SELECT propertyname
    FROM holdingproperty`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Holding property data fetched successfully");
      return res.status(200).json(result);
    }
  });
});

app.get("/checkworkholdingpropertyname", (req, res) => {
  const sql = `
    SELECT propertyname
    FROM workholdingproperty`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Holding property data fetched successfully");
      return res.status(200).json(result);
    }
  });
});

app.get("/checkrentalpropertyname", (req, res) => {
  const sql = `
    SELECT propertyname
    FROM rentalproperty`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching rental property data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Rental property data fetched successfully");
      return res.status(200).json(result);
    }
  });
});

app.get("/checkworkrentalpropertyname", (req, res) => {
  const sql = `
    SELECT propertyname
    FROM workrentalproperty`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching rental property data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Rental property names fetched successfully");
      return res.status(200).json(result);
    }
  });
});

app.get("/checkotherpropertyname", (req, res) => {
  const sql = `
    SELECT *
    FROM otherproperty`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching rental property data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Other property data fetched successfully");
      return res.status(200).json(result);
    }
  });
});

app.get("/getInvestments/:investorId", (req, res) => {
  const investorId = req.params.investorId;

  const sql1 = `
  SELECT i.id AS holdinginvestment_id, i.*, hp.*
  FROM holdinginvestment i
  LEFT JOIN holdingproperty hp ON i.holdingproperty_id = hp.id
  WHERE i.investor_id = ?;
`;

  const sql2 = `
  SELECT i.id AS investment_id, i.*, rp.*
  FROM investments i
  LEFT JOIN rentalproperty rp ON i.rentalproperty_id = rp.id
  WHERE i.investor_id = ?;
`;

  const sql3 = `
  SELECT i.id AS developmentinvestment_id, i.*, dp.*
  FROM developmentinvestment i
  LEFT JOIN developmentproperty dp ON i.developmentproperty_id = dp.id
  WHERE i.investor_id = ?;
`;

  db.query(sql1, [investorId], (err1, holdingInvestmentResult) => {
    if (err1) {
      console.error("Error fetching holding investment data:", err1);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err1.message });
    }

    db.query(sql2, [investorId], (err2, investmentsResult) => {
      if (err2) {
        console.error("Error fetching investments data:", err2);
        return res
          .status(500)
          .json({ error: "Internal Server Error", message: err2.message });
      }

      db.query(sql3, [investorId], (err3, developmentInvestmentResult) => {
        if (err3) {
          console.error("Error fetching development investment data:", err3);
          return res
            .status(500)
            .json({ error: "Internal Server Error", message: err3.message });
        }

        console.log("Investment data fetched successfully");

        const responseData = {
          holdingInvestments: holdingInvestmentResult,
          investments: investmentsResult,
          developmentInvestments: developmentInvestmentResult,
        };

        return res.status(200).json(responseData);
      });
    });
  });
});

app.get("/getInvestmentsById/:id", (req, res) => {
  const investorId = req.params.id;

  const sql1 = `
  SELECT i.id AS holdinginvestment_id, i.*, hp.*
  FROM holdinginvestment i
  LEFT JOIN holdingproperty hp ON i.holdingproperty_id = hp.id
  WHERE i.id = ?;
`;

  const sql2 = `
  SELECT i.id AS investment_id, i.*, rp.*
  FROM investments i
  LEFT JOIN rentalproperty rp ON i.rentalproperty_id = rp.id
  WHERE i.id = ?;
`;

  const sql3 = `
  SELECT i.id AS developmentinvestment_id, i.*, dp.*
  FROM developmentinvestment i
  LEFT JOIN developmentproperty dp ON i.developmentproperty_id = dp.id
  WHERE i.id = ?;
`;

  db.query(sql1, [investorId], (err1, holdingInvestmentResult) => {
    if (err1) {
      console.error("Error fetching holding investment data:", err1);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err1.message });
    }

    db.query(sql2, [investorId], (err2, investmentsResult) => {
      if (err2) {
        console.error("Error fetching investments data:", err2);
        return res
          .status(500)
          .json({ error: "Internal Server Error", message: err2.message });
      }

      db.query(sql3, [investorId], (err3, developmentInvestmentResult) => {
        if (err3) {
          console.error("Error fetching development investment data:", err3);
          return res
            .status(500)
            .json({ error: "Internal Server Error", message: err3.message });
        }

        console.log("Investment data fetched successfully");

        const responseData = {
          holdingInvestments: holdingInvestmentResult,
          investments: investmentsResult,
          developmentInvestments: developmentInvestmentResult,
        };

        return res.status(200).json(responseData);
      });
    });
  });
});

const otherstorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = "./othersproperty";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// File filter
const otherfilter = (req, file, cb) => {
  if (file.fieldname === "landpictures") {
    const allowedImageTypes = /jpeg|jpg|png|gif/;
    const extname = allowedImageTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedImageTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only JPEG, JPG, PNG, or GIF images are allowed for landpictures!"
        )
      );
    }
  } else if (
    file.fieldname === "financialdocument" ||
    file.fieldname === "legaldocument"
  ) {
    const allowedFileTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only PDF or DOCX files are allowed for financialdocument and legaldocument!"
        )
      );
    }
  } else if (file.fieldname === "propertylogo") {
    const allowedImageTypes = /jpeg|jpg|png|gif/;
    const extname = allowedImageTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedImageTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only JPEG, JPG, PNG, or GIF images are allowed for propertylogo!"
        )
      );
    }
  } else {
    cb(new Error("Error: Unsupported fieldname!"));
  }
};

// Multer upload initialization
const otherupload = multer({
  storage: otherstorage,
  fileFilter: otherfilter,
  limits: { fileSize: 1000000 }, // Set a limit for the file size if needed
}).fields([
  { name: "landpictures", maxCount: 80 },
  { name: "financialdocument", maxCount: 80 },
  { name: "legaldocument", maxCount: 80 },
  { name: "propertylogo", maxCount: 1 },
]);

// Route handler for '/otherproperty' endpoint
app.post("/otherproperty", (req, res) => {
  otherupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;

      const sql = `
      INSERT INTO otherproperty (
        investmentinformation,
        investmentvalue,
        investmenttype,
        location,
        investmentterms,
        status,
        landpictures,
        description,
        financialdocument,
        legaldocument,
        propertylogo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`;

      db.query(
        sql,
        [
          requestData.investmentinformation,
          requestData.investmentvalue,
          requestData.investmenttype,
          requestData.location,
          requestData.investmentterms,
          requestData.status,
          req.files["landpictures"]
            ? req.files["landpictures"].map((file) => file.path).join(",")
            : null,
          requestData.description,
          req.files["financialdocument"]
            ? req.files["financialdocument"].map((file) => file.path).join(",")
            : null,
          req.files["legaldocument"]
            ? req.files["legaldocument"].map((file) => file.path).join(",")
            : null,
          req.files["propertylogo"][0].path,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data inserted successfully");
            return res
              .status(200)
              .json({ message: "Other Property added successfully" });
          }
        }
      );
    }
  });
});

const workotherstorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = "./workothersproperty";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
// File filter
const workotherfilter = (req, file, cb) => {
  if (file.fieldname === "landpictures") {
    const allowedImageTypes = /jpeg|jpg|png|gif/;
    const extname = allowedImageTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedImageTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only JPEG, JPG, PNG, or GIF images are allowed for landpictures!"
        )
      );
    }
  } else if (
    file.fieldname === "financialdocument" ||
    file.fieldname === "legaldocument"
  ) {
    const allowedFileTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only PDF or DOCX files are allowed for financialdocument and legaldocument!"
        )
      );
    }
  } else if (file.fieldname === "propertylogo") {
    const allowedImageTypes = /jpeg|jpg|png|gif/;
    const extname = allowedImageTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedImageTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only JPEG, JPG, PNG, or GIF images are allowed for propertylogo!"
        )
      );
    }
  } else {
    cb(new Error("Error: Unsupported fieldname!"));
  }
};

// Multer upload initialization
const workotherupload = multer({
  storage: workotherstorage,
  fileFilter: workotherfilter,
  limits: { fileSize: 1000000 }, // Set a limit for the file size if needed
}).fields([
  { name: "landpictures", maxCount: 80 },
  { name: "financialdocument", maxCount: 80 },
  { name: "legaldocument", maxCount: 80 },
  { name: "propertylogo", maxCount: 1 },
]);

// Route handler for '/otherproperty' endpoint
app.post("/workotherproperty", (req, res) => {
  workotherupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;

      const sql = `
      INSERT INTO workotherproperty(
        investmentinformation,
        investmentvalue,
        investmenttype,
        location,
        investmentterms,
        status,
        landpictures,
        description,
        financialdocument,
        legaldocument,
        propertylogo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`;

      db.query(
        sql,
        [
          requestData.investmentinformation,
          requestData.investmentvalue,
          requestData.investmenttype,
          requestData.location,
          requestData.investmentterms,
          requestData.status,
          req.files["landpictures"]
            ? req.files["landpictures"].map((file) => file.path).join(",")
            : null,
          requestData.description,
          req.files["financialdocument"]
            ? req.files["financialdocument"].map((file) => file.path).join(",")
            : null,
          req.files["legaldocument"]
            ? req.files["legaldocument"].map((file) => file.path).join(",")
            : null,
          req.files["propertylogo"][0].path,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data inserted successfully");
            return res
              .status(200)
              .json({ message: "Other Property added successfully" });
          }
        }
      );
    }
  });
});

app.post("/otherinvestment", (req, res) => {
  const requestData = req.body;
  const sql = `
    INSERT INTO otherinvestment (
      investmentinformation,
      investmentvalue,
      investmenttype,
      location,
      investmentterms,
      status,
      landpictures,
      description,
      financialdocument,
      legaldocument
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(
    sql,
    [
      requestData.investmentinformation,
      requestData.investmentvalue,
      requestData.investmenttype,
      requestData.location,
      requestData.investmentterms,
      requestData.status,
      requestData.landpictures,
      requestData.description,
      requestData.financialdocument,
      requestData.legaldocument,
    ],
    (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res
          .status(500)
          .json({ error: "Internal Server Error", message: err.message });
      } else {
        console.log("Data inserted successfully");
        return res
          .status(200)
          .json({ message: "Other investment added successfully" });
      }
    }
  );
});
const addinvestmentstorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = "./addinvestment";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// File filter
const investmentfilter = (req, file, cb) => {
  if (file.fieldname === "supportingdocument") {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedImageTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedImageTypes.test(
      file.mimetype.split("/")[1].toLowerCase()
    ); // Get the second part of the mimetype (e.g., 'jpeg', 'jpg')

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only JPEG, JPG, PNG, GIF, or WEBP images are allowed for supporting documents!"
        )
      );
    }
  }
};

// Multer upload initialization
const addinvestmentupload = multer({
  storage: addinvestmentstorage,
  fileFilter: investmentfilter,
  limits: { fileSize: 10000000 }, // Set a limit for the file size if needed
}).fields([{ name: "supportingdocument", maxCount: 80 }]);

// Route handler for '/otherproperty' endpoint
// Route handler for '/otherproperty' endpoint
// Route handler for '/otherproperty' endpoint
app.post("/addinvestment", (req, res) => {
  addinvestmentupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;
      const supportingDocuments = [];
      if (req.files["supportingdocument"]) {
        req.files["supportingdocument"].forEach((file) => {
          supportingDocuments.push(file.path);
        });
      }
      let supportingDocumentsTransaction = "";
      if (req.files["supportingdocument"]) {
        
        req.files["supportingdocument"].forEach((file, index) => {
          console.log("Supporting Document file name:", file.originalname);
          supportingDocumentsTransaction += index === 0  ?"rentaltransaction\\"+ file.originalname : "," + file.originalname;
        });
      }
      console.log("Supporting Documents Transaction:", supportingDocumentsTransaction);

      const sql = `
        INSERT INTO investments (
          propertyname,
          investmentamount,
          investmentdate,
          investmenttype,
          investmentpercentage,
          notes,
          supportingdocument,
          rentalproperty_id,
          investor_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.investmentamount,
          requestData.investmentdate,
          requestData.investmenttype,
          requestData.investmentpercentage,
          requestData.notes,
          supportingDocuments,
          requestData.rentalproperty_id,
          requestData.investor_id,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting data into investments:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data inserted successfully into investments");

            // Insert data into rentaltransaction table
            const rentalTransactionSql = `
              INSERT INTO rentaltransaction (
                propertyname,
                notes,
                investor_id,
                transactionamount,
                transactiondate,
                transactiontype,
                property_id,
                supportingdocuments
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
              rentalTransactionSql,
              [
                requestData.propertyname,
                requestData.notes,
                requestData.investor_id,
                requestData.investmentamount,
                requestData.investmentdate,
                requestData.investmenttype,
                requestData.rentalproperty_id,
                supportingDocumentsTransaction,
              ],
              (err, result) => {
                if (err) {
                  console.error("Error inserting data into rentaltransaction:", err);
                  return res
                    .status(500)
                    .json({ error: "Internal Server Error", message: err.message });
                } else {
                  console.log("Data inserted successfully into rentaltransaction");
                  return res
                    .status(200)
                    .json({ message: "Investment and transaction added successfully" });
                }
              }
            );
          }
        }
      );
    }
  });
});

app.put("/updaterentalinvestment/:id", (req, res) => {
  const investmentId = req.params.id;
  addinvestmentupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;
      let supportingDocuments = "";
      if (req.files["supportingdocument"]) {
        req.files["supportingdocument"].forEach((file, index) => {
          if (index === 0) {
            supportingDocuments += file.path;
          } else {
            supportingDocuments += "," + file.path;
          }
        });
      }
      const sql = `
        UPDATE investments
        SET
          propertyname = ?,
          investmentamount = ?,
          investmentdate = ?,
          investmenttype = ?,
          investmentpercentage = ?,
          notes = ?,
          supportingdocument = ?
        WHERE
          id = ?`;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.investmentamount,
          requestData.investmentdate,
          requestData.investmenttype,
          requestData.investmentpercentage,
          requestData.notes,
          supportingDocuments,
          investmentId, // Investment ID to identify the record to update
        ],
        (err, result) => {
          if (err) {
            console.error("Error updating data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data updated successfully");
            return res
              .status(200)
              .json({ message: "Investment updated successfully" });
          }
        }
      );
    }
  });
});

app.get("/geteditinvestment/:id", (req, res) => {
  const investmentId = req.params.id;

  const sql = `
    SELECT * FROM investments
    WHERE id = ?`;

  db.query(sql, [investmentId], (err, results) => {
    if (err) {
      console.error("Error fetching investment data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ error: "Not Found", message: "Investment not found" });
    }
    const investmentData = results[0]; // Assuming there is only one investment with the given ID
    return res.status(200).json({ investment: investmentData });
  });
});

const adddevelopmentinvestmentstorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = "./developmentinvestment";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// File filter
const developmentinvestmentfilter = (req, file, cb) => {
  if (file.fieldname === "supportingdocument") {
    const allowedDocumentTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedDocumentTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedDocumentTypes.test(
      file.mimetype.split("/")[1].toLowerCase()
    ); // Get the second part of the mimetype (e.g., 'pdf', 'doc')
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only PDF, DOC, DOCX, or TXT documents are allowed for supporting documents!"
        )
      );
    }
  }
};
// Multer upload initialization
const adddevelopmentinvestmentupload = multer({
  storage: adddevelopmentinvestmentstorage,
  fileFilter: developmentinvestmentfilter,
  limits: { fileSize: 10000000 }, // Set a limit for the file size if needed
}).fields([{ name: "supportingdocument", maxCount: 80 }]);

app.post("/adddevelopmentinvestment", (req, res) => {
  adddevelopmentinvestmentupload(req, res, (err) => {
    console.log("Supporting Document:", req.files["supportingdocument"]);
    if (err) {
      console.error("Error uploading file:", err);
      return res.status(500).json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;
      let supportingDocuments = "";
      if (req.files["supportingdocument"]) {
        req.files["supportingdocument"].forEach((file, index) => {
          supportingDocuments += index === 0 ? file.path : "," + file.path;
        });
      }
      let supportingDocumentsTransaction = "";
      if (req.files["supportingdocument"]) {
        
        req.files["supportingdocument"].forEach((file, index) => {
          console.log("Supporting Document file name:", file.originalname);
          supportingDocumentsTransaction += index === 0  ?"developmenttransaction\\"+ file.originalname : "," + file.originalname;
        });
      }
      console.log("Supporting Documents Transaction:", supportingDocumentsTransaction);

      const sql = `
        INSERT INTO developmentinvestment (
          propertyname,
          investmentamount,
          investmentdate,
          investmenttype,
          investmentpercentage,
          notes,
          supportingdocument,
          developmentproperty_id,
          investor_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.investmentamount,
          requestData.investmentdate,
          requestData.investmenttype,
          requestData.investmentpercentage,
          requestData.notes,
          supportingDocuments,
          requestData.developmentproperty_id,
          requestData.investor_id,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting data into developmentinvestment:", err);
            return res.status(500).json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data inserted successfully into developmentinvestment");

            // Now, insert data into developmenttransaction table
            const developmentTransactionSql = `
              INSERT INTO developmenttransaction (
                propertyname,
                transactionamount,
                transactiondate,
                transactiontype,
                notes,
                supportingdocuments,
                investor_id,
                property_id
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

            db.query(
              developmentTransactionSql,
              [
                requestData.propertyname,
                requestData.investmentamount,
                requestData.investmentdate,
                requestData.investmenttype,
                requestData.notes,
                supportingDocumentsTransaction,
                requestData.investor_id,
                requestData.developmentproperty_id,
              ],
              (err, result) => {
                if (err) {
                  console.error("Error inserting data into developmenttransaction:", err);
                  return res.status(500).json({ error: "Internal Server Error", message: err.message });
                } else {
                  console.log("Data inserted successfully into developmenttransaction");
                  return res.status(200).json({ message: "Investment and transaction added successfully" });
                }
              }
            );
          }
        }
      );
    }
  });
});


app.put("/updatedevelopmentinvestment/:id", (req, res) => {
  const investmentId = req.params.id;
  adddevelopmentinvestmentupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;
      let supportingDocuments = "";
      if (req.files["supportingdocument"]) {
        req.files["supportingdocument"].forEach((file, index) => {
          if (index === 0) {
            supportingDocuments += file.path;
          } else {
            supportingDocuments += "," + file.path;
          }
        });
      }
      const sql = `
        UPDATE developmentinvestment
        SET
          propertyname = ?,
          investmentamount = ?,
          investmentdate = ?,
          investmenttype = ?,
          investmentpercentage = ?,
          notes = ?,
          supportingdocument = ?
        WHERE
          id = ?`;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.investmentamount,
          requestData.investmentdate,
          requestData.investmenttype,
          requestData.investmentpercentage,
          requestData.notes,
          supportingDocuments,
          investmentId, // Investment ID to identify the record to update
        ],
        (err, result) => {
          if (err) {
            console.error("Error updating data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data updated successfully");
            return res
              .status(200)
              .json({ message: "Investment updated successfully" });
          }
        }
      );
    }
  });
});

const addholdinginvestmentstorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = "./holdinginvestment";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// File filter
const holdinginvestmentfilter = (req, file, cb) => {
  if (file.fieldname === "supportingdocument") {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedImageTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedImageTypes.test(
      file.mimetype.split("/")[1].toLowerCase()
    ); // Get the second part of the mimetype (e.g., 'jpeg', 'jpg')
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Error: Only JPEG, JPG, PNG, GIF, or WEBP images are allowed for supporting documents!"
        )
      );
    }
  }
};

// Multer upload initialization
const addholdinginvestmentupload = multer({
  storage: addholdinginvestmentstorage,
  fileFilter: holdinginvestmentfilter,
  limits: { fileSize: 10000000 }, // Set a limit for the file size if needed
}).fields([{ name: "supportingdocument", maxCount: 80 }]);

app.post("/addholdinginvestment", (req, res) => {
  addholdinginvestmentupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;
      const supportingDocuments = [];
      if (req.files["supportingdocument"]) {
        req.files["supportingdocument"].forEach((file) => {
          supportingDocuments.push(file.path);
        });
      }
      
let supportingDocumentsTransaction = "";
      if (req.files["supportingdocument"]) {
        
        req.files["supportingdocument"].forEach((file, index) => {
          console.log("Supporting Document file name:", file.originalname);
          supportingDocumentsTransaction += index === 0  ?"developmenttransaction\\"+ file.originalname : "," + file.originalname;
        });
      }
console.log("Supporting Documents Transaction:", supportingDocumentsTransaction);

      const sql = `
        INSERT INTO holdinginvestment (
          propertyname,
          investmentamount,
          investmentdate,
          investmenttype,
          investmentpercentage,
          notes,
          supportingdocument,
          holdingproperty_id,
          investor_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.investmentamount,
          requestData.investmentdate,
          requestData.investmenttype,
          requestData.investmentpercentage,
          requestData.notes,
          supportingDocuments.join(","), // Join file paths with comma delimiter
          requestData.holdingproperty_id,
          requestData.investor_id,
        ],
        (err, investmentResult) => { // Renamed `result` to `investmentResult`
          if (err) {
            console.error("Error inserting data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data inserted successfully into holdinginvestment");

            // Insert data into holdingtransaction table
            const holdingTransactionSql = `
              INSERT INTO holdingtransaction (
                propertyname,
                transactionamount,
                transactiondate,
                transactiontype,
                notes,
                supportingdocuments,
                investor_id,
                investment_id,
                holdingproperty_id
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
              holdingTransactionSql,
              [
                requestData.propertyname,
                requestData.investmentamount,
                requestData.investmentdate,
                requestData.investmenttype,
                requestData.notes,
                supportingDocuments.join(","), // Join file paths with comma delimiter
                requestData.investor_id,
                investmentResult.insertId, // Use the ID of the newly inserted investment
                requestData.holdingproperty_id,
              ],
              (err, transactionResult) => { // Renamed `result` to `transactionResult`
                if (err) {
                  console.error("Error inserting data into holdingtransaction:", err);
                  return res
                    .status(500)
                    .json({ error: "Internal Server Error", message: err.message });
                } else {
                  console.log("Data inserted successfully into holdingtransaction");
                  return res
                    .status(200)
                    .json({ message: "Investment and transaction added successfully" });
                }
              }
            );
          }
        }
      );
    }
  });
});


app.put("/updateholdinginvestment/:id", (req, res) => {
  const investmentId = req.params.id;
  addholdinginvestmentupload(req, res, (err) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;
      let supportingDocuments = "";

      if (req.files["supportingdocument"]) {
        req.files["supportingdocument"].forEach((file, index) => {
          if (index === 0) {
            supportingDocuments += file.path;
          } else {
            supportingDocuments += "," + file.path;
          }
        });
      }
      const sql = `
        UPDATE holdinginvestment
        SET
          propertyname = ?,
          investmentamount = ?,
          investmentdate = ?,
          investmenttype = ?,
          investmentpercentage = ?,
          notes = ?,
          supportingdocument = ?
        WHERE
          id = ?`;
      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.investmentamount,
          requestData.investmentdate,
          requestData.investmenttype,
          requestData.investmentpercentage,
          requestData.notes,
          supportingDocuments,
          investmentId, // Investment ID to identify the record to update
        ],
        (err, result) => {
          if (err) {
            console.error("Error updating data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data updated successfully");
            return res
              .status(200)
              .json({ message: "Investment updated successfully" });
          }
        }
      );
    }
  });
});

const supportingDocumentsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = "./rentaltransaction";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// Multer file filter function for supporting documents
const supportingDocumentsFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedImageTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedImageTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Error: Only JPEG, JPG, PNG, or GIF images are allowed for supporting documents!"
      )
    );
  }
};

// Multer upload initialization for supporting documents
const supportingDocumentsUpload = multer({
  storage: supportingDocumentsStorage,
  fileFilter: supportingDocumentsFilter,
  limits: { fileSize: 50000000 }, // Set a limit for the file size if needed
}).array("supportingdocuments", 80); // Allow up to 5 supporting documents

// Route handler for '/rentaltransaction' endpoint
app.post("/rentaltransaction", (req, res) => {
  // Handle file uploads for supporting documents
  supportingDocumentsUpload(req, res, (err) => {
    if (err) {
      console.error("Error uploading supporting documents:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;
      const sql = `
        INSERT INTO rentaltransaction (
          propertyname,
          transactionamount,
          transactiondate,
          transactiontype,
          supportingdocuments,
          notes,
          investor_id,
          investment_id,
          property_id
        ) VALUES (?, ?, ?, ?, ?, ?,?,?,?)`;
      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.transactionamount,
          requestData.transactiondate,
          requestData.transactiontype,
          req.files.map((file) => file.path).join(","), // Concatenate file paths for supporting documents
          requestData.notes,
          requestData.investor_id,
          requestData.investment_id,
          requestData.property_id,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data inserted successfully");
            return res
              .status(200)
              .json({ message: "Rental transaction added successfully" });
          }
        }
      );
    }
  });
});

// Multer configuration for supporting documents of development transactions
const developmentDocumentsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = "./developmenttransaction";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// Multer file filter function for supporting documents of development transactions
const developmentDocumentsFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedImageTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedImageTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Error: Only JPEG, JPG, PNG, or GIF images are allowed for supporting documents of development transactions!"
      )
    );
  }
};

// Multer upload initialization for supporting documents of development transactions
const developmentDocumentsUpload = multer({
  storage: developmentDocumentsStorage,
  fileFilter: developmentDocumentsFilter,
  limits: { fileSize: 50000000 }, // Set a limit for the file size if needed
}).array("supportingdocuments", 80); // Allow up to 5 supporting documents

// Route handler for '/developmenttransaction' endpoint
app.post("/developmenttransaction", (req, res) => {
  // Handle file uploads for supporting documents
  developmentDocumentsUpload(req, res, (err) => {
    if (err) {
      console.error(
        "Error uploading supporting documents for development transaction:",
        err
      );
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;
      const sql = `
        INSERT INTO developmenttransaction (
          propertyname,
          transactionamount,
          transactiondate,
          transactiontype,
          supportingdocuments,
          notes,
          investor_id,
          investment_id,
          property_id
        ) VALUES (?, ?, ?, ?, ?, ?,?,?,?)`;
      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.transactionamount,
          requestData.transactiondate,
          requestData.transactiontype,
          req.files.map((file) => file.path).join(","), // Concatenate file paths for supporting documents
          requestData.notes,
          requestData.investor_id,
          requestData.investment_id,
          requestData.property_id,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting development transaction data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Development transaction data inserted successfully");
            return res
              .status(200)
              .json({ message: "Development transaction added successfully" });
          }
        }
      );
    }
  });
});

const holdingDocumentsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = "./holdingtransaction";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// Multer file filter function for holding documents
const holdingDocumentsFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedImageTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedImageTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Error: Only JPEG, JPG, PNG, or GIF images are allowed for holding documents!"
      )
    );
  }
};

// Multer upload initialization for holding documents
const holdingDocumentsUpload = multer({
  storage: holdingDocumentsStorage,
  fileFilter: holdingDocumentsFilter,
  limits: { fileSize: 50000000 }, // Set a limit for the file size if needed
}).array("supportingdocuments", 80); // Allow up to 5 holding documents

// Route handler for '/holdingtransaction' endpoint
app.post("/holdingtransaction", (req, res) => {
  // console.log("API REQUEST: ", req);
  
  // Handle file uploads for holding documents
  holdingDocumentsUpload(req, res, (err) => {
    if (err) {
      console.error("Error uploading holding documents:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      const requestData = req.body;
      console.log("API REQUEST: ", requestData);
      const sql = `
        INSERT INTO holdingtransaction (
          propertyname,
          transactionamount,
          transactiondate,
          transactiontype,
          supportingdocuments,
          notes,
          investor_id,
          investment_id,
          holdingproperty_id
        ) VALUES (?, ?, ?, ?, ?, ?,?,?,?)`;
      db.query(
        sql,
        [
          requestData.propertyname,
          requestData.transactionamount,
          requestData.transactiondate,
          requestData.transactiontype,
          req.files.map((file) => file.path).join(","), // Concatenate file paths for holding documents
          requestData.notes,
          requestData.investor_id,
          requestData.investment_id,
          requestData.holdingproperty_id,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting data:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", message: err.message });
          } else {
            console.log("Data inserted successfully");
            return res
              .status(200)
              .json({ message: "Holding transaction added successfully" });
          }
        }
      );
    }
  });
});

app.get("/getallinvestedproperty", (req, res) => {
  try {
    const rentalPropertyIds = req.query.rentalPropertyIds
      .split(",")
      .map(Number);
    const developmentPropertyIds = req.query.developmentPropertyIds
      .split(",")
      .map(Number);
    const holdingPropertyIds = req.query.holdingPropertyIds
      .split(",")
      .map(Number);
    let rentalPropertyData = [];
    let developmentPropertyData = [];
    let holdingPropertyData = [];
    // Fetch data from rentalproperty table
    if (rentalPropertyIds.length > 0) {
      const rentalSql = "SELECT * FROM rentalproperty WHERE id IN (?)";
      db.query(rentalSql, [rentalPropertyIds], (err, results) => {
        if (err) {
          console.error("Error fetching rental property data:", err);
          res
            .status(500)
            .json({ error: "Internal Server Error", message: err.message });
          return;
        }
        rentalPropertyData = results;
        sendDataIfReady();
      });
    }
    // Fetch data from developmentproperty table
    if (developmentPropertyIds.length > 0) {
      const developmentSql =
        "SELECT * FROM developmentproperty WHERE id IN (?)";
      db.query(developmentSql, [developmentPropertyIds], (err, results) => {
        if (err) {
          console.error("Error fetching development property data:", err);
          res
            .status(500)
            .json({ error: "Internal Server Error", message: err.message });
          return;
        }
        developmentPropertyData = results;
        sendDataIfReady();
      });
    }
    // Fetch data from holdingproperty table
    if (holdingPropertyIds.length > 0) {
      const holdingSql = "SELECT * FROM holdingproperty WHERE id IN (?)";
      db.query(holdingSql, [holdingPropertyIds], (err, results) => {
        if (err) {
          console.error("Error fetching holding property data:", err);
          res
            .status(500)
            .json({ error: "Internal Server Error", message: err.message });
          return;
        }
        holdingPropertyData = results;
        sendDataIfReady();
      });
    }
    function sendDataIfReady() {
      // Check if all data has been fetched
      if (
        rentalPropertyData.length +
          developmentPropertyData.length +
          holdingPropertyData.length ===
        rentalPropertyIds.length +
          developmentPropertyIds.length +
          holdingPropertyIds.length
      ) {
        res.json({
          rentalPropertyData,
          developmentPropertyData,
          holdingPropertyData,
        });
      }
    }
  } catch (error) {
    console.error("Error processing request:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", message: error.message });
  }
});

// Endpoint to fetch data from the rentaltransaction table
app.get("/getrentaltransaction", (req, res) => {
  const investorId = req.query.investorId;
  const investmentId = req.query.investmentId;
  if (!investorId || !investmentId) {
    return res
      .status(400)
      .json({
        error: "Bad Request",
        message: "Both Investor ID and Investment ID are required",
      });
  }
  const sql = `
    SELECT *
    FROM rentaltransaction
    WHERE investor_id = ? AND investment_id = ?`;

  db.query(sql, [investorId, investmentId], (err, result) => {
    if (err) {
      console.error("Error fetching rental transaction data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Rental transaction data fetched successfully");
      return res.status(200).json(result);
    }
  });
});

app.get("/getrentalinvestorpropertycount", (req, res) => {
  const sql = `
    SELECT rentalproperty_id, COUNT(DISTINCT investor_id) AS investor_count
    FROM investments
    GROUP BY rentalproperty_id`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching investor property count:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      console.log("Investor property count fetched successfully");
      return res.status(200).json(result);
    }
  });
});

app.get("/getrentalRandomProperties", (req, res) => {
  const sql = `
    SELECT id AS rentalproperty_id, propertyname AS property_name, investor_count
    FROM rentalproperty
    WHERE propertystatus = 'enabled' AND investor_count > 0
    ORDER BY investor_count DESC, RAND()
    LIMIT 4`;
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching random rental properties:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (result.length < 4) {
        const remainingRows = 4 - result.length;
        const sqlZeroInvestorCount = `
          SELECT id AS rentalproperty_id, propertyname AS property_name, investor_count
          FROM rentalproperty
          WHERE propertystatus = 'enabled' AND investor_count = 0
          ORDER BY LEFT(propertyname, 1) ASC
          LIMIT ${remainingRows}`;
        db.query(sqlZeroInvestorCount, (errZero, resultZero) => {
          if (errZero) {
            console.error(
              "Error fetching zero investor count rental properties:",
              errZero
            );
            return res
              .status(500)
              .json({
                error: "Internal Server Error",
                message: errZero.message,
              });
          } else {
            console.log(
              "Zero investor count rental properties fetched successfully"
            );
            const combinedResult = result.concat(resultZero);
            // Calculate percentage for each row
            combinedResult.forEach((row) => {
              row.percentage = parseFloat(
                (
                  (row.investor_count /
                    (row.investor_count +
                      result.reduce(
                        (acc, curr) => acc + curr.investor_count,
                        0
                      ))) *
                  100
                ).toFixed(2)
              );
            });
            const responseObject = {};
            combinedResult.forEach((row, index) => {
              responseObject[`property_${index + 1}`] = row;
            });
            return res.status(200).json(responseObject);
          }
        });
      } else {
        console.log("Random rental properties fetched successfully");
        // Calculate percentage for each row
        result.forEach((row) => {
          row.percentage = parseFloat(
            (
              (row.investor_count /
                result.reduce((acc, curr) => acc + curr.investor_count, 0)) *
              100
            ).toFixed(2)
          );
        });
        const responseObject = {};
        result.forEach((row, index) => {
          responseObject[`property_${index + 1}`] = row;
        });
        return res.status(200).json(responseObject);
      }
    }
  });
});

app.get("/getholdingRandomProperties", (req, res) => {
  const sql = `
    SELECT id AS holdingproperty_id, propertyname AS property_name, investor_count
    FROM holdingproperty
    WHERE propertystatus = 'enabled' AND investor_count > 0
    ORDER BY investor_count DESC, RAND()
    LIMIT 4`;
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching random holding properties:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (result.length < 4) {
        const remainingRows = 4 - result.length;
        const sqlZeroInvestorCount = `
          SELECT id AS holdingproperty_id, propertyname AS property_name, investor_count
          FROM holdingproperty
          WHERE propertystatus = 'enabled' AND investor_count = 0
          ORDER BY LEFT(propertyname, 1) ASC
          LIMIT ${remainingRows}`;
        db.query(sqlZeroInvestorCount, (errZero, resultZero) => {
          if (errZero) {
            console.error(
              "Error fetching zero investor count holding properties:",
              errZero
            );
            return res
              .status(500)
              .json({
                error: "Internal Server Error",
                message: errZero.message,
              });
          } else {
            console.log(
              "Zero investor count holding properties fetched successfully"
            );
            const combinedResult = result.concat(resultZero);
            // Calculate total investor count
            const totalInvestorCount = combinedResult.reduce(
              (acc, curr) => acc + curr.investor_count,
              0
            );
            // Calculate percentage for each row
            combinedResult.forEach((row) => {
              row.percentage = parseFloat(
                ((row.investor_count / totalInvestorCount) * 100).toFixed(2)
              );
            });
            const responseObject = {};
            combinedResult.forEach((row, index) => {
              responseObject[`property_${index + 1}`] = row;
            });
            return res.status(200).json(responseObject);
          }
        });
      } else {
        console.log("Random holding properties fetched successfully");
        // Calculate total investor count
        const totalInvestorCount = result.reduce(
          (acc, curr) => acc + curr.investor_count,
          0
        );
        // Calculate percentage for each row
        result.forEach((row) => {
          row.percentage = parseFloat(
            ((row.investor_count / totalInvestorCount) * 100).toFixed(2)
          );
        });
        const responseObject = {};
        result.forEach((row, index) => {
          responseObject[`property_${index + 1}`] = row;
        });
        return res.status(200).json(responseObject);
      }
    }
  });
});

app.get("/getdevelopmentRandomProperties", (req, res) => {
  const sql = `
    SELECT id AS developmentproperty_id, propertyname AS property_name, investor_count
    FROM developmentproperty
    WHERE propertystatus = 'enabled' AND investor_count > 0
    ORDER BY investor_count DESC, RAND()
    LIMIT 4`;
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching random development properties:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: err.message });
    } else {
      if (result.length < 4) {
        const remainingRows = 4 - result.length;
        const sqlZeroInvestorCount = `
          SELECT id AS developmentproperty_id, propertyname AS property_name, investor_count
          FROM developmentproperty
          WHERE propertystatus = 'enabled' AND investor_count = 0
          ORDER BY LEFT(propertyname, 1) ASC
          LIMIT ${remainingRows}`;
        db.query(sqlZeroInvestorCount, (errZero, resultZero) => {
          if (errZero) {
            console.error(
              "Error fetching zero investor count development properties:",
              errZero
            );
            return res
              .status(500)
              .json({
                error: "Internal Server Error",
                message: errZero.message,
              });
          } else {
            console.log(
              "Zero investor count development properties fetched successfully"
            );
            const combinedResult = result.concat(resultZero);
            // Calculate percentage for each row
            const totalInvestorCount = combinedResult.reduce(
              (acc, curr) => acc + curr.investor_count,
              0
            );
            const responseObject = {};
            combinedResult.forEach((row, index) => {
              responseObject[`property_${index + 1}`] = {
                ...row,
                percentage: parseFloat(
                  ((row.investor_count / totalInvestorCount) * 100).toFixed(2)
                ),
              };
            });
            return res.status(200).json(responseObject);
          }
        });
      } else {
        console.log("Random development properties fetched successfully");
        // Calculate percentage for each row
        const totalInvestorCount = result.reduce(
          (acc, curr) => acc + curr.investor_count,
          0
        );
        const responseObject = {};
        result.forEach((row, index) => {
          responseObject[`property_${index + 1}`] = {
            ...row,
            percentage: parseFloat(
              ((row.investor_count / totalInvestorCount) * 100).toFixed(2)
            ),
          };
        });
        return res.status(200).json(responseObject);
      }
    }
  });
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
