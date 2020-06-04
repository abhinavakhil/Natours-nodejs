import axios from 'axios';
import { showAlert } from './alert';

// type is either 'password' or 'data'  & data is an obj
export const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? '/api/v1/users/updateMyPassword'
        : '/api/v1/users/updateMe';
    const res = await axios({
      method: 'PATCH',
      url,
      data, // data:data
    });

    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()}Data updated successfully!`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
