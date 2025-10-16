const User = require("../models/User");
const Stripe = require("stripe");
const jwt = require("jsonwebtoken");

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY ||
    "sk_test_51Rkj7vFCQ9u4Yd73VSweoQOSrpUKUXDpx6eTHeyf5hncKWoNFop1AkaHWeGBTfbo07pyQ1XA3IgE1aDlex0Jl16a00KbFReR2A"
);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

exports.stripe = async (req, res) => {
    console.log("Stripe webhook handler called");
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
console.log(event)
  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;


      if (session.mode === "subscription") {
        const customerId = session.customer;
        const subscriptionId = session.subscription;

   

        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId
        );
        console.log(subscription);

        const priceId = subscription.items?.data?.[0]?.price?.id || null;
        console.log(priceId);
        // Update User with subscription data
        const user = await User.findOne({ email: session.customer_details.email });
        if (!user) break;

        await User.findOneAndUpdate(
          {
            email: user.email,
            "subscription.stripeCustomerId": "",
          },
          {
            "subscription.stripeCustomerId": customerId,
            "subscription.latestInvoice": subscription.latest_invoice,
            "subscription.plan": subscription.plan.id,
            "subscription.status": subscription.status,
            "subscription.startDate": subscription.start_date * 1000,
            "subscription.endDate": subscription.end_date
              ? subscription.end_date * 1000
              : null,
            "subscription.stripeSubscriptionId": subscription.id,
            "subscription.trialEndsAt": subscription.trial_end
              ? subscription.trial_end * 1000
              : null,
          }
        );
      }

      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      // fetch customer using stripe
      const customer = await stripe.customers.retrieve(customerId);
      // fetch customer email
      if (!customer.email) {
        console.error("Customer email not found");
        return res.status(400).send("Customer email not found");
      }
      

      const priceId = subscription.items?.data?.[0]?.price?.id || null;

      await User.findOneAndUpdate(
        { email: customer.email },
        {
          stripeCustomerId: customerId,
          subscriptionData: {
            ...subscription,
            priceId,
          },
        }
      );

      break;
    }

    case "customer.subscription.deleted": {
      const deleted = event.data.object;
      // Remove subscriptionData from User
      await User.findOneAndUpdate(
        { "subscription.stripeSubscriptionId": deleted.id },
        { $unset: { subscription: "" } }
      );
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;

      if (invoice.billing_reason === "subscription_cycle") {
        await User.findOneAndUpdate(
          { "subscription.stripeSubscriptionId": invoice.subscription },
          {
            $set: {
              "subscription.status": "active",
              "subscription.endDate": invoice.period_end,
              "subscription.latestInvoice": invoice,
            },
          }
        );
      }

      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;

      await User.findOneAndUpdate(
        { "subscription.stripeSubscriptionId": invoice.subscription },
        {
          $set: {
            "subscription.status": invoice.paid ? "active" : "unpaid",
            "subscription.latestInvoice": invoice,
          },
        }
      );

      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true, event: event });
};

