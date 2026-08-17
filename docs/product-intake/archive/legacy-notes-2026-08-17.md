# Legacy Product Notes Import

Imported: 2026-08-17

This file preserves the complete owner-authored source used for the initial
product-intake migration. Spelling and wording remain unchanged. Triage
records link back to these sections rather than replacing this evidence.

Note this is a file that I will populate every so often when i need to write down my findings and experiences when testing and using the website. This is a place that for right now will be where I add/list future ideas, bugs, inconveniences and issues I might come across of or think off.

Your role in this? When requested or when you are just simply curios have a look at the bellow and you can decide of appropriate if we should address it depending on the current task or whether we should accept that the feature or fix should come before a task in plan.
This file should always be committed as it also acts as a form of tracking system.

## Item 1

1. You tube player embed in listen mode does not need all the extras like full screen pause and play etc. controls since majority is handled by the app so we should hide it like on tv mode but still allow the full screen and other buttons to work where needed(there should also be a copy link buttons since what if you want to re-add it to the queue quickly)(should perhaps be handled by the add media redesign page task where I want to add proper usefulness to that instead of forcing the user to go and find the links first)

## Item 2

2. A change with the queue drawer queue items, so since I occasionally use yt music for my music since the watch app does not have proper algorithm logic yet for easy listen to next and get suggested next in queue automatically(much later task) I can at lease make this one structured change request. Which is the queue drawer currently relies on the arrows to change queue items positions I want to make it so that you can grab and drag them where you want to without worrying about repeated clicking or semi working pin logic. We already have the left icons to support this the same way yt music does it all we need is the logic and proper UI changes to make it feel interactive and animated.


## Item 3

3. For the vr mode, I want a toggle under the owner only setting menu that when toggled on shows the vr mode button next to the tv mode button(should have its own proper icon too) Also when this is toggled on the vr mode should automatically detect if it is on vr headset of course and give a prompt to enter vr mode that is not intrusive to the user it should be easily closable and not in the way like the same way people show cookies acceptance pop ups right below the bottom. (that reminds me that we should at some point also have our own cookies prompt for first time users)

## Item 4

4. Bug report, long named people break the room basically in the sense where they can not join the room or other stuff


## Item 5

5. Another bug report, if I sing out of google while in a room, then do a refresh go back tot he home page that "saved" room disappeared from the saved spaced option the only way to go back it via browser history and even if I look at the saved room button it still shows it is saved but in the home page it is no longer there not even a rejoin or recent room status. This might of been when i assigned the room to be saved under the google account and it is not showing in the home room area. Since that uses probably browser based storage or guest cookie stuff still

## Item 6

6. Another thing we should definitely show the saved room under the account window under the rooms tab as it currently does nothing


## Item 7

7. And a weird edge case bug i found, if a suer gets the too many redirects error from google it sometimes prevents them from seeing the current playing media they still see the duration bar move pause play etc but no media is being played or heared they just see a black screen, not shure how this is caused or fixed.

Also this is console erros I found on 07/17/2026:
0pmh9uxic1z6..js:42 ℹ️ INFO Connecting to SpacetimeDB WS...
0pmh9uxic1z6..js:42 ❌ ERROR Updating a row that was not present in the cache. Table: room_participant, RowId: f959bf5a-69b2-49c1-ae06-74f245e88a22:c74aa724-72a3-4f4f-a205-5b0fb43ce4cb
www-widgetapi.js:163 Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('https://www.youtube.com') does not match the recipient window's origin ('https://watch.mistakestudios.com').
(anonymous) @ www-widgetapi.js:163
www-widgetapi.js:163 Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('https://www.youtube.com') does not match the recipient window's origin ('https://watch.mistakestudios.com').
(anonymous) @ www-widgetapi.js:163
www-widgetapi.js:163 Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('https://www.youtube.com') does not match the recipient window's origin ('https://watch.mistakestudios.com').
(anonymous) @ www-widgetapi.js:163
Ha4NUgi-PUw?autoplay=0&controls=1&enablejsapi=1&origin=https%3A%2F%2Fwatch.mistakestudios.com&plays…:1 Access to fetch at 'https://googleads.g.doubleclick.net/pagead/viewthroughconversion/962985656/?backend=innertube&cname=56&cver=2_20260716&foc_id=9ImTi0cbFHs7PQ4l2jGO1g&label=followon_view&ptype=no_rmkt&random=1042946074&cv_attributed=0' (redirected from 'https://www.youtube.com/pagead/viewthroughconversion/962985656/?backend=innertube&cname=56&cver=2_20260716&foc_id=9ImTi0cbFHs7PQ4l2jGO1g&label=followon_view&ptype=no_rmkt&random=1042946074') from origin 'https://www.youtube.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
googleads.g.doubleclick.net/pagead/viewthroughconversion/962985656/?backend=innertube&cname=56&cver=2_20260716&foc_id=9ImTi0cbFHs7PQ4l2jGO1g&label=followon_view&ptype=no_rmkt&random=1042946074&cv_attributed=0:1  Failed to load resource: net::ERR_FAILED


## Item 8

8. Feature fix/update
So the website does publish the current playing media meatadata it even shows the pause button but that is only the button for the yt video sp it does not actually pauyse due to spacetime owning that control, so after the listen  mode yt embed ui change where we turn it off we can then expose the pause skip and previous buttons or rather push the controls features with the metadata to allow users to pause skip and previous like one usually would be able to

## Item 9

9. Also that reminds me with the previous button by default when pressed it should simply restart the currently playing song by putting duration bat to 0 and if it is pressed twice it then goes back to the previous song. I believe this is how most media apps handle it rather do some research on how to handle this properly please.

## Item 10

10. Bug or not good feature, after about 30 min a case happens where I bleiev the temp url that exposes teh video link of the uploaded media expires causing the most reent refresh to still continue on with the new one but the old one basically has the video frozen with the duration still moving on.


## Item 11

11. Found an inconvenience, so when a person refreshed the audio bar always goes back to about 70% it should alsoways keep track of a localstate that remembers the value the user set the audio bar to as that is just conventional. But before you go and blindly fix it, first check if there is not something else already handling this as some parts point to that being the case like perhaps only people who signed in with their google has this option or something.

## Item 12

12. Need to reattach the cloudconvert api key and double check the setting are proper for the conversions, also need a shurefire way to do the conversion to be ready for the website without having to rely on the cloudconvert api. So perhaps an easy to use download file or a script where you choose the file or files you want then it converts them and the system should know that correct files do not need to go through the cloudconvert api since it is already correct. Need your opinion and idea on this, as my idea is a custom mini app that does what I suggested above that is probably like 12 mb in size or something with a GUI and a drag and drop interface that only has the prupose of prepping the videos to be uplopaded and perhaps we can then host this on a website or something and integrate it into the website so that that becomes the defauly anner of conversion and only if we need to do more than one at a time we can then decide to use the cloudconvert as well.


## Item 13

13. Found another missing feature with the new like system, so to give context I liked a song in a room, this room hs 2 google authed users which are both my same google account(one is on my laptop and one is on my main pc). It is a room that is saved to the google account of course, so when i saved the song it showed it was saved but never updated on the laptop so this is something that needs to be looked into and fixed.

## Item 14

14. Will write this down as it is something that is an incoviencine. So when I refresh the room with a user that is alwrady in the same room and they are the host and playing the song the page refreshes and then the yt emded area asks to click to refresh so it can play or resurem which then does indeed resume but it is not the same or even close to the same time as what the other user is playing the song at. and it can be 2min apparts even longer actually so that is somethign that needs to be looked into
