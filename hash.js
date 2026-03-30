import bcrypt from 'bcrypt';

const password = 'N4v3g4r_1s_L1f3!2026';

bcrypt.hash(password, 10).then((hash) => {
  console.log(hash);
});
