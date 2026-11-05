# Notifications

The panel can set up two common notifications for you. It fills in Home Assistant's automation
editor, and you save the automation there. After that it's a normal automation that you can
edit, turn off or delete. For anything else, build your own with the
[Smart Plants triggers and actions](automations.md).

## Set up a notification

1. In the Smart Plants panel, select **⋮ > Notifications** on the overview or a plant's page,
   then **Add notification**. You also find **Set up notifications** on a plant's
   **Automations** card and after you create a plant; there the plant is already chosen.
2. Pick one of the two notifications, the plants and where to send the message.
3. Select **Open in automation editor**, check the automation and select **Save**.

Each save creates one automation. Select **Add notification** again to add the other one.

## Daily plant report

One message a day at the time you pick, 08:00 by default, when at least one plant needs water,
has a problem or has a care task due:

```text
2 plants need attention
• Aloe (Kitchen): Needs water. Due: Fertilize
• Office Aloe: Low light
```

Nothing is sent on days when all plants are fine. Snoozed and paused plants are left out.

## Message when a plant needs water

Each plant sends its own message, for example *Aloe needs water*. You pick a delay: right
away, 15 or 30 minutes (the default), 1 or 2 hours. The delay keeps a short dip from sending a
message. A plant that started to need water during a snooze sends its message when the snooze
ends.

**Quiet hours** are off by default. When on, messages between the two times (22:00 to 07:00
by default) are dropped, not sent later.

## Choose the plants and the destination

- **All plants**, the default, includes plants you add later. The editor shows it as the
  **All plants** entity.
- **Choose plants** limits the notification to the plants you tick. Plants you add later need
  an edit of the automation.

**Send to** lists notification entities (`notify.*`), then notification services such as
`mobile_app_my_phone`, then **Home Assistant notification**, which is always there.

## Your notifications

The **Notifications** page lists your notifications under **Your notifications**, with a
switch to turn each on or off, its plants, when it last sent a message, and **Edit**. Its
address is `/smart-plants/notifications`, so you can link to it from a dashboard.

With at least one notification, a bell with a check mark appears in the panel header and opens
the page. The bell has no number on it: it shows that notifications are set up, not that
messages are waiting. The **⋮** menus show how many you have next to **Notifications**, and the
plant's **Automations** card marks them with a bell.

A **Choose plants** notification shows the plants that its Smart Plants triggers, conditions
and actions target, so it follows your edits. An **All plants** notification always shows
*For all plants*.

Delete a notification under **Settings > Automations & scenes**. The page finds the
automations by their trigger IDs, which start with `smart_plants_`. If you change all of them,
the automation keeps working but the page no longer lists it.

## Known limitations

- The texts are written in the panel's language when you open the editor. Edit the automation
  to change them later.
- The editor saves only with the default `automation: !include automations.yaml` line. With
  split files or packages, copy the YAML from the editor (**⋮ > Edit in YAML**) into your
  files.
- If the editor opens empty, your Home Assistant didn't accept the filled-in automation, and
  the panel says so. Build it from the [examples](automations.md#examples).
