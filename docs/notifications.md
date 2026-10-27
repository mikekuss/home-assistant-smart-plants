# Notifications

The Smart Plants panel can set up two common notifications for you. It doesn't send anything
itself. It fills in Home Assistant's automation editor, you check the automation and save it
there, and from then on it is a normal automation that you can see, edit, turn off or delete
like any other.

If you want something else, build your own automation with the Smart Plants triggers,
conditions and the `smart_plants.get_report` action described in
[Automations](automations.md).

## Set up a notification

1. Open **Smart Plants** in the sidebar.
2. On the plants overview, open **⋮ → Notifications…**.
3. Choose one of the two notifications, the plants, and where to send the message.
4. Select **Open in automation editor**. Home Assistant's editor opens with the automation
   filled in.
5. Check it and select **Save**.

Each save creates one automation. To add the other notification too, open
**⋮ → Notifications…** again.

### Daily plant report

One message a day, at the time you pick (08:00 by default), when at least one plant needs
water, has a problem or has a care task due. The message lists those plants, one line each,
for example:

```text
2 plants need attention
• Aloe (Kitchen): Needs water. Due: Fertilize
• Office Aloe: Low light
```

On a day when everything is fine, nothing is sent. Snoozed and paused plants are left out.

### Tell me right away when a plant needs water

A message as soon as a plant needs water, or after it has needed water for the delay you pick
(30 minutes by default; you can choose right away, 15 or 30 minutes, 1 or 2 hours). The delay
keeps a short dip in the reading from sending a message. Each plant sends its own message, for
example *Aloe needs water*.

A plant that started to need water while it was snoozed sends its message once the snooze
ends.

**Quiet hours** are off by default. Turn them on to get no messages between two times (22:00
to 07:00 by default). A message that would arrive during quiet hours is dropped, not sent
later. If you also have the daily report, it still lists the plant.

### Plants

**All plants** (the default) includes plants you add later. In the automation editor the
target shows as the **All plants** entity, which Smart Plants creates for this. If you deleted
or disabled that entity, the target is left empty, which also means all plants.

**Choose plants** limits the notification to the plants you tick. The editor shows them as
devices. A plant you add later is not included until you edit the automation.

### Send to

The list shows, in this order:

1. Notification entities (`notify.*`), by name. Newer Telegram, email and companion app
   setups create these.
2. Notification services, such as `mobile_app_my_phone`.
3. **Home Assistant notification**, which shows the message in Home Assistant's own
   notifications. It is always there and is the default when nothing else is set up.

## Your notifications

When you have at least one notification set up this way, the dialog lists it under **Your
notifications** with:

- a switch that turns the automation on or off,
- when it last sent a message,
- **Edit**, which opens it in the automation editor.

To delete one, use **Settings → Automations & scenes** in Home Assistant. If you pick the same
notification and plants again, the dialog says that you already have it. You can still create
a second one.

The dialog finds these automations by the **Trigger ID** of their first trigger, which starts
with `smart_plants_`. Keep that ID when you edit the automation. If you change or remove it,
the automation keeps working, but the dialog no longer lists it.

## Things to know

- The texts (name, description and message) are written in the panel's language when you open
  the editor. They don't change later if you switch Home Assistant to another language. Edit
  the automation to change them. The daily report asks for the same language, so its title
  and message match the rest of the automation.
- Home Assistant's editor can only save automations when your `configuration.yaml` has the
  default `automation: !include automations.yaml` line. If you keep automations in split files
  or packages, saving fails or writes to a file Home Assistant doesn't load. In that case copy
  the YAML from the editor (**⋮ → Edit in YAML**) into your own files.
- If the editor opens empty, your Home Assistant frontend didn't accept the filled-in
  automation and the panel shows a message. Build the automation by hand from the examples in
  [Automations](automations.md).
