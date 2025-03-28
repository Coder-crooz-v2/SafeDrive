import mongoose, {Schema} from "mongoose";

const accidentDataSchema = new Schema({
    location: 
        [
            {
                type: Number,
                required: true
            }
        ],
    speed: {
        type: Number,
        required: true
    },
    isDrowsy: {
        type: Boolean,
        required: true
    },
    isOversped: {
        type: Boolean,
        required: true
    },
    victim: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})


export const AccidentData = mongoose.model("AccidentData", accidentDataSchema)