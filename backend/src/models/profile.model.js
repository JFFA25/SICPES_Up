const db = require("../database/db");

const getProfileByUserId = async (userId) => {
  const [rows] = await db.promise().query(
    `SELECT id, nombre, email, telefono, foto_perfil_url
     FROM tbd_usuarios
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
};

const updateProfilePhoto = async (userId, photoUrl) => {
  const [result] = await db.promise().query(
    "UPDATE tbd_usuarios SET foto_perfil_url = ? WHERE id = ?",
    [photoUrl, userId]
  );

  return result.affectedRows > 0;
};

module.exports = { getProfileByUserId, updateProfilePhoto };
