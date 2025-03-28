import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema(
    {
        role: {
            type: String,
            required: true,
            default: "user"
        },
        fullName: {
            type: String,
            required: true,
            trim: true, 
            index: true
        },
        vehicleType: {
            type: String,
            required: true,
            trim: true
        },
        vehicleModel: {
            type: String,
            required: true,
            trim: true
        },
        vehicleNumber: {
            type: String,
            required: true,
            trim: true
        },
        licenseNumber: {
            type: String,
            required: true,
            trim: true
        },
        age: {
            type: Number,
            required: true,
            trim: true
        },
        gender: {
            type: String,
            required: true,
            trim: true
        },
        serviceProvider: {
            type: Schema.Types.ObjectId,
            ref: "Admin"
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowecase: true,
            trim: true,
        },
        phoneNumber: {
            type: String,
            required: true,
            trim: true
        },
        photo: {
            type: String, // cloudinary url
            required: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required']
        },
        refreshToken: {
            type: String
        }

    },
    {
        timestamps: true
    }
)

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            phoneNumber: this.phoneNumber,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)