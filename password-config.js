const { authenticate } = require('passport')

const LocalStrategy = require('passport-local').Strategy
const bcyrpt = require('bcrypt');

function initialize(passport, getUserByEmail, getUserById){
    const authenticateUser = async (email, password, done) => {
        let user = await getUserByEmail(email);
        if (user == null){
            return done(null, false, {message: "No user with that email"})
        }

        try{
            if (await bcyrpt.compare(password, user[0].password)){
                return done(null, user)
            }   
            else{
                return done(null, false, {message: 'Password incorrect'})
            }
        }
        catch(e){
            return done(e)
        }
    }

    passport.use(new LocalStrategy({usernameField: 'email'}, authenticateUser));
    passport.serializeUser((user, done) => done(null, user))
    passport.deserializeUser(async (id, done) => {
        let user = await getUserById(id);
        return done(null, user)
    })


}

module.exports = initialize