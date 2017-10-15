const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
// Requiring our Note and Article models
const Note = require("./models/Note.js");
const Article = require("./models/Article.js");
// Our scraping tools
const request = require("request");
const cheerio = require("cheerio");
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;


// Initialize Express
const app = express();
const PORT = process.env.PORT || 8080;

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());
app.use(bodyParser.json({ type: "application/vnd.api+json" }));

const exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Make public a static dir
app.use(express.static("public"));

// Setup routes
app.get("/", (req, res) => res.render("index"));

app.get("/scrape", function(req,res){
  //Scrape NPR
  const articles = [];
  request("http://www.npr.org/sections/news/", function(err, response, html){
    const $ = cheerio.load(html);
    $(".resaudio").remove();  //remove unwanted audio articles from DOM
    $(".affiliation").remove(); //remove affilition links
    $("article h2").each(function(i, element){
      const result = {
        title: $(this).children("a").text(),
        link: $(this).children("a").attr("href")
      }
      articles.push(result);
    });
    res.render("scrape", {articles: articles});
  });
});

app.get("/saved", function(req,res){
  Article.find({}, function(err, doc){
    if(err){
      console.log(err);
      res.sendStatus(500);
    } else {
      console.log(doc);
      res.render("saved",{articles: doc});
    }
  });
});

app.post("/save/article", function(req, res){
  const entry = new Article(req.body);
  entry.save(function(err, doc){
    if(err) {
      console.log(err);
      res.sendStatus(400);
    } else {
      res.sendStatus(200);
    }
  });
});

app.delete("/delete/article", function(req, res){
  Article.remove({_id: req.body.id}, function(error, doc){
    if(error){
      res.sendStatus(400);
    } else {
      res.sendStatus(200);
    }
  });
});

app.post("/save/note", function(req,res){
  const newNote = new Note(req.body);
  newNote.save(function(error, doc){
    if(error){
      res.sendStatus(400);
    } else {
      User.findOneAndUpdate({}, { $push: { "notes": doc._id } }, { new: true }, function(err, newdoc) {
        // Send any errors to the browser
        if (err) {
          res.send(504);
        }
        // Or send the newdoc to the browser
        else {
          res.send(newdoc);
        }
      });
    }
  })
})

// Database configuration with mongoose
mongoose.connect("mongodb://localhost/news-scraper");
const db = mongoose.connection;

// Show any mongoose errors
db.on("error", (error) => console.log("Mongoose Error: ", error));

// Once logged in to the db through mongoose, log a success message
// then set the app to listen, log a listening message
db.once("open", function() {
  console.log("Mongoose connection successful.");
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
});



