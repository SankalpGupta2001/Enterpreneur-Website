const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const mongoose = require("mongoose");
const axios = require('axios');
app.use(bodyParser.urlencoded({ extended: true }));
const ejs = require("ejs");
app.use(express.static("public"));
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const bcrypt = require("bcryptjs");
app.set('view engine', 'ejs');
const saltRounds = 10;
app.use(bodyParser.urlencoded({
    extended: true

}));
require('dotenv').config()
mongoose.connect("mongodb://localhost:27017/stud", { useNewUrlParser: true });
const detail = new mongoose.Schema({
    name: String,
    email: String,
    score: String

});
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});
const User = new mongoose.model("User", userSchema);

const Article = new mongoose.model("details", detail);

app.use(require('express-session')({ secret: 'our enterpreneurship website', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});




// passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home",

},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));



app.get("/", function (req, res) {
    res.render("index");
})

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/home',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/home');
    });

app.get("/login", function (req, res) {

    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});
app.post("/register", function (req, res) {


    const user = new User({ email: req.body.email, password: req.body.password });
    user.save(function () { res.redirect("/home"); });



});


app.get('/logout', function (req, res, next) {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});


app.post("/login", function (req, res) {
    const user = new User({
        email: req.body.email,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        }
        else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/home");
            });
        }
    })
});


app.get("/home", function (req, res) {

    axios.get('http://localhost:3000/articles')
        .then(function (response) {
            res.render("home", { users: response.data });
        })

});

app.get("/New-user", function (req, res) {
    res.render("new-user");
});

app.get("/updated-user", function (req, res) {

    axios.get("http://localhost:3000/articles", { params: { id: req.query.id } })
        .then(function (userdata) {
            //console.log(userdata);
            const id = req.query.id;
            //console.log(id);
            const objectWeNeed = userdata.data.find((car) => car._id === id);

            //console.log(objectWeNeed);
            res.render("update-user", { w: objectWeNeed });

        })

})
app.get("/deleted-user", function (req, res) {
    axios.get("http://localhost:3000/articles", { params: { id: req.query.id } })
        .then(function (userdata) {
            const id = req.query.id;
            //console.log(userdata.data);
            //console.log(id);
            Article.deleteOne(
                { _id: id },

                function (err) {
                    if (!err) {
                        res.redirect("/home");

                    }
                    else {
                        res.send(err);
                    }
                }
            )
        })

})

app.route("/articles")

    .get(function (req, res) {
        Article.find(function (err, foundArticles) {
            if (err) {
                // console.log(err);
                res.send(err);
            }
            else {
                //     console.log(foundArticles);
                res.send(foundArticles);

            }
        });
    })

    .post(function (req, res) {

        const newArticle = new Article({
            email: req.body.email,
            score: req.body.score
        });
        Article.findOne({ _id: req.body.id }, { name: req.body.name, email: req.body.email, score: req.body.score }, function (err, foundArticle) {
            if (foundArticle) {
                Article.updateOne(
                    { _id: req.body.id },
                    { $set: req.body },

                    function (err) {
                        if (!err) {
                            res.redirect("/home");
                        }
                        else {
                            res.send(err);
                        }
                    }

                )
            }
            else {
                newArticle.save(function (err) {
                    if (err) {
                        res.send(err);
                    }
                    else {

                        //res.send("successfully updated information");
                        res.redirect("/New-user");
                    }
                });
            }
        });

    })

    .delete(function (req, res) {
        Article.deleteMany(function (err) {
            if (err) {
                res.send(err);
            }
            else {
                res.send("succeffuly deleted");
            }
        });
    });

app.listen(3000, function (req, res) {
    console.log("Server is running on port 3000");
})


