import axios from 'axios';
import { showAlert } from './alert';
//////////here we will take public key ie. publishible key by clicking get your test api key
/// secret key is used in backend and public in frontend
const stripe = Stripe(
  'pk_test_51GqCetK2Ko8I4rWHZ9myiT4SAC8WUjx5AfCQ04GHKoNAkZsheVWA0OYpkIkKjSkT8i23kGmxs84zM6W0cweFS4WS00uDzIgUeH'
);

// this tourId will be taken from tour.pug
export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios({
      method: 'GET',
      url: `/api/v1/bookings/checkout-session/${tourId}`,
    });

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
