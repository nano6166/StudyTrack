// Saves each user's Canvas access token in the users table (Sync with Canvas).
// The token is encrypted with AES-256-GCM before it is stored, so a copy of the database alone
// does not reveal it. The key comes from CANVAS_TOKEN_SECRET, or SESSION_SECRET when that is not set.
const crypto = require("node:crypto");

function key() {
    const secret = process.env.CANVAS_TOKEN_SECRET || process.env.SESSION_SECRET || "studytrack-dev-only";
    return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(token) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
    const data = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64")).join(".");
}

// Returns null when the stored value cannot be read (for example, after the secret changed)
function decrypt(stored) {
    try {
        const [iv, tag, data] = stored.split(".").map((part) => Buffer.from(part, "base64"));
        const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    } catch {
        return null;
    }
}

async function save(db, username, token) {
    await db.none("UPDATE users SET canvas_token = $1 WHERE username = $2", [encrypt(token), username]);
}

async function load(db, username) {
    const row = await db.oneOrNone("SELECT canvas_token FROM users WHERE username = $1", [username]);
    return row && row.canvas_token ? decrypt(row.canvas_token) : null;
}

async function remove(db, username) {
    await db.none("UPDATE users SET canvas_token = NULL WHERE username = $1", [username]);
}

module.exports = { encrypt, decrypt, save, load, remove };
