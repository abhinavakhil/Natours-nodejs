// axios returns a promise so lets do async and await
// axios also provide error if something went wrong so we can use try ,catch block to handle error
import axios from 'axios';
import { showAlert } from './alert';

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/login',
      data: {
        email, //email:email
        password,
      },
    });

    // if we successfully sent the data then reload and tour to overview i.e roor
    if (res.data.status === 'success') {
      showAlert('success', 'Logged in Successfully!');
      window.setTimeout(() => {
        //reloading to another page after 1500 ms i.e 1 and 50 sec
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    // err.response.data is to check error full nicely formated error response ( read at axios)
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/users/logout',
    });

    if (res.data.status === 'success') {
      location.reload(true);
    }
  } catch (err) {
    showAlert('error', 'Error logging out! Try again.');
  }
};
