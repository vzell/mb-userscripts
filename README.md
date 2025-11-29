# MusicBrainz UserScripts

- [MusicBrainz - Customizable Selector for Packaging, Type, Status, Language and Script on release pages](#mb_customizable_selector)
- [MusicBrainz - Customizable Language Selector on work and alias pages](#mb_customizable_language_selector)
- [Musicbrainz: Set recording comments for a release](#mb_set_recording_comments_for_a_release)
- [Display shortcut for relationships on MusicBrainz](#mb_relationship_shortcuts)
- [MusicBrainz: Customizable PrimaryType Selector](#mb_customizable_primarytype_selector)
- [MusicBrainz: Customizable Status Selector](#mb_customizable_status_selector)
- [MusicBrainz: Customizable Packaging Selector](#mb_customizable_packaging_selector)
- [Edit Release: No Label & No Cat. no Button](#mb_nolabel_nocatno)
- [Batch Add Relationships To Recordings](#mb_batch_add_relationships_to_recordings)
- [MusicBrainz UUID Validator (Lowercase Hex)](#mb_uuid_validator)
- [MusicBrainz: Auto-Select Discography Link Type](#mb_auto_select_discography_link_type)


The Loujine scripts temporarely needed to be patched with the folloing line:

// @require      https://gist.githubusercontent.com/reosarevok/e9fc05d7f251379c301b948623b3ef03/raw/e635364e2c3a60578bb349a9a95483711f6c4e4d/gistfile1.js

instead of

// @require      https://raw.githubusercontent.com/loujine/musicbrainz-scripts/master/mbz-loujine-common.js


 - https://raw.githubusercontent.com/loujine/musicbrainz-scripts/master/mb-reledit-guess_works.user.js
 - https://raw.githubusercontent.com/loujine/musicbrainz-scripts/master/mb-reledit-set_relation_attrs.user.js
 - https://raw.githubusercontent.com/loujine/musicbrainz-scripts/master/mb-reledit-copy_dates.user.js


## <a name="mb_relationship_shortcuts"></a> Display shortcut for relationships on MusicBrainz

Display icon shortcut for relationships of release-group, release, recording and work: e.g. Amazon, Discogs, Wikipedia, ... links. This allows to access some relationships without opening the entity page.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/DisplayShortcutForRelationship-CustomFavicons.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/DisplayShortcutForRelationship-CustomFavicons.user.js)

## <a name="mb_set_recording_comments_for_a_release"></a> Set recording comments for a release

Batch set recording comments from a Release page, prefilling from "recorded at:" prefixed with "live, " if comment is
empty. Prefills edit note with user supplied configurable text.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/SetRecordingComment-Prefilled-CustomEditNode.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/SetRecordingComment-Prefilled-CustomEditNode.user.js)

## <a name="mb_customizable_primarytype_selector"></a> Customizable PrimaryType Selector

Create buttons for quickly choosing the primary type when adding a new release.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/CustomizablePrimaryTypeSelector.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/CustomizablePrimaryTypeSelector.user.js)

## <a name="#mb_customizable_status_selector"></a> Customizable Status Selector

Create buttons for quickly choosing the status when adding a new release.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/CustomizableStatusSlector.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/CustomizableStatusSlector.user.js)

## <a name="#mb_customizable_packaging_selector"></a> CustomizablePackagingSelector

Create buttons for quickly choosing the package when adding a new release.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/CustomizablePackagingSelector.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/CustomizablePackagingSelector.user.js)

## <a name="##mb_nolabel_nocatno"></a> Edit Release: No Label & No Cat. no Button

Adds a No Label & No Cat. no button to MusicBrainz release editor.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/NoLabelAndCatnoButtons.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/NoLabelAndCatnoButtons.user.js)

## <a name="##mb_batch_add_relationships_to_recordings"></a> Batch Add Relationships To Recordings

Insert artist buttons, open batch-add dialog, reliably fill relationship type (instruments|vocal|performed / performer), artist, instrument/vocal, credited-as, click Done — sequential queue + dialog lifecycle awareness.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/BatchAddRelationshipsToRecordings.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/BatchAddRelationshipsToRecordings.user.js)

## <a name="##mb_uuid_validator"></a> MusicBrainz UUID Validator (Lowercase Hex)

Ensures the MusicBrainz ID field accepts only valid, lowercase UUIDs on the SpringsteenLyrics editing pages.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/MusicbrainzUUIDValidator.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/MusicbrainzUUIDValidator.user.js)

## <a name="##mb_auto_select_discography_link_type"></a> MusicBrainz: Auto-Select Discography Link Type

Allows configuration of link mappings (URL Regex -> Link Type ID). Automatically selects link types for configured URLs, cleans up URLs on paste, and moves focus to the next link input. Implements strict hierarchical ESC key handling for nested modals.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/AutoSelectExternalLinkType.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/AutoSelectExternalLinkType.user.js)

## <a name="##mb_customizable_selector"></a> MusicBrainz Customizable Selector (Packaging, Type, Status, Language, Script)

Adds customizable quick-select buttons for Primary Type, Status, Language, Script and Packaging on release pages.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/CustomizableMultiSelector.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/CustomizableMultiSelector.user.js)

## <a name="##mb_customizable_language_selector"></a> MusicBrainz Customizable Language Selector for works and aliases (adopted from YoGo9)

Add customizable quick-select buttons for languages and locales in MusicBrainz work and alias pages.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/CustomizableLanguageSelector.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/CustomizableLanguageSelector.user.js)
