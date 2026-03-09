import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = process.env.TWILIO_PHONE_NUMBER;

/**
 * Build the SMS message sent to a contact when a beacon fires.
 * Deliberately short — fits in a single SMS frame.
 */
export function buildAlertMessage({ senderName, lat, lng, primaryMeeting }) {
  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
  const lines = [
    `🔔 ${senderName} has sent you an emergency alert.`,
    `Location: ${mapsUrl}`,
  ];
  if (primaryMeeting) {
    lines.push(`Meeting place: ${primaryMeeting}`);
  }
  lines.push("Reply STOP to unsubscribe.");
  return lines.join("\n");
}

/**
 * Build the SMS sent to outside contacts — includes a link to the full plan.
 */
export function buildOutsideAlertMessage({ senderName, lat, lng, shareUrl, primaryMeeting }) {
  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
  const lines = [
    `🔔 ${senderName} has sent an emergency alert.`,
    `Last known location: ${mapsUrl}`,
    `Full plan: ${shareUrl}`,
  ];
  if (primaryMeeting) {
    lines.push(`Primary meeting place: ${primaryMeeting}`);
  }
  return lines.join("\n");
}

/**
 * Send a single SMS. Returns the Twilio message SID.
 */
export async function sendSMS({ to, body }) {
  try {
    const msg = await client.messages.create({ from: FROM, to, body });
    return { sid: msg.sid, status: msg.status };
  } catch (err) {
    console.error(`SMS failed to ${to}:`, err.message);
    return { error: err.message };
  }
}

/**
 * Fan out alert SMS to all contacts for a user.
 * Called by the beacon endpoint after saving the location.
 */
export async function notifyContacts({ contacts, plan, beacon, senderName, baseUrl }) {
  const shareUrl = `${baseUrl}/plan/${plan.share_token}`;
  const primaryMeeting = plan.meeting?.primary || null;

  const results = await Promise.allSettled(
    contacts.map((contact) => {
      const body = contact.outside
        ? buildOutsideAlertMessage({ senderName, lat: beacon.lat, lng: beacon.lng, shareUrl, primaryMeeting })
        : buildAlertMessage({ senderName, lat: beacon.lat, lng: beacon.lng, primaryMeeting });

      return sendSMS({ to: contact.phone, body });
    })
  );

  return results.map((r, i) => ({
    contactId: contacts[i].id,
    name: contacts[i].name,
    ...(r.status === "fulfilled" ? r.value : { error: r.reason?.message }),
  }));
}
