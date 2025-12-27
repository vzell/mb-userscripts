# MusicBrainz UserScripts

- [MusicBrainz - Customizable Selector for Packaging, Type, Status, Language and Script on release pages](#mb_customizable_selector)
- [MusicBrainz - Customizable Language Selector on work and alias pages](#mb_customizable_language_selector)
- [MusicBrainz - NO Label & Catalognumber Buttons](#mb_nolabel_nocatno)
- [MusicBrainz - Auto-Select External Link Types](#mb_auto_select_discography_link_type)
- [Musicbrainz - Generate Recording Comments For A Release](#mb_generate_recording_comments_for_a_release)
- [MusicBrainz - Display shortcut for relationships on MusicBrainz](#mb_relationship_shortcuts)
- [MusicBrainz - Import Relationships From A Discogs Release In To A Musicbrainz Release](#mb_import_from_discogs)
- [MusicBrainz Relation Editor - Batch Add Relationships To Recordings](#mb_batch_add_relationships_to_recordings)
---
**Adapted from [loujine](https://github.com/loujine/musicbrainz-scripts)**
- [MusicBrainz Relation Editor - Replace Release Relations By Recording Relations](#mb_replace_release_relations_by_recording_relations)
- [MusicBrainz Relation Editor - Clone Recording Relations Onto Other Recordings](#mb_clone_recording_relations_onto_other_relations)
- [MusicBrainz Relation Editor - Set Role In Recording-Artist Relation](#mb_set_role_recording_artist_relation)
- [MusicBrainz Relation Editor - Guess Related Works In Batch](#mb_guess_related_works)
- [MusicBrainz Relation Editor - Set Relation Attributes](#mb_set_relation_attributes)
- [MusicBrainz Relation Editor - Copy Dates On Recording Relations](#mb_copy_dates_on_recordings)
<!-- - [MusicBrainz: Customizable PrimaryType Selector](#mb_customizable_primarytype_selector) -->
<!-- - [MusicBrainz: Customizable Status Selector](#mb_customizable_status_selector) -->
<!-- - [MusicBrainz: Customizable Packaging Selector](#mb_customizable_packaging_selector) -->
---
- [SpringsteenLyrics - MusicBrainz UUID Validator](#sl_uuid_validator)
---
- [BruceBase – Auto 200 Revisions](#bb_auto_200_revisions)
---


## <a name="mb_customizable_selector"></a> MusicBrainz - Customizable Selector for Packaging, Type, Status, Language and Script on release pages

Adds customizable quick-select buttons for Primary Type, Status, Language, Script and Packaging on release pages.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/CustomizableMultiSelector.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/CustomizableMultiSelector.user.js)

## <a name="mb_customizable_language_selector"></a> MusicBrainz - Customizable Language Selector on work and alias pages
Add customizable quick-select buttons for languages and locales in MusicBrainz work and alias pages.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/CustomizableLanguageSelector.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/CustomizableLanguageSelector.user.js)

## <a name="mb_nolabel_nocatno"></a> MusicBrainz - NO Label & Catalognumber Buttons

Adds a "NO Label" & "NO Catalognumber" button to the MusicBrainz release editor.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/NoLabelAndCatnoButtons.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/NoLabelAndCatnoButtons.user.js)

## <a name="mb_auto_select_discography_link_type"></a> MusicBrainz - Auto-Select External Link Types

Auto-Select External Link Types on release pages, allows configuration of link mappings (URL Regex -> Link Type ID)

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/AutoSelectExternalLinkType.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/AutoSelectExternalLinkType.user.js)

## <a name="mb_generate_recording_comments_for_a_release"></a> Generate Recording Comments For A Release

Batch set recording comments from a Release page, prefilling from "recorded at:" prefixed with "live, " if comment is empty. Prefills edit note with user supplied configurable text.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/GenerateRecordingCommentForRelease.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/GenerateRecordingCommentForRelease.user.js)

## <a name="mb_relationship_shortcuts"></a> Display shortcut for relationships on MusicBrainz

Display icon shortcuts for relationships of release-group, release, recording and work: e.g. Amazon, Discogs, Wikipedia but also selfconfigured ones are supported.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/DisplayShortcutForRelationshipWithCustomFavicons.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/DisplayShortcutForRelationshipWithCustomFavicons.user.js)

## <a name="mb_import_from_discogs"></a> Import Relationships From A Discogs Release In To A Musicbrainz Release

Add a button to import Discogs release relationships to MusicBrainz

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/ImportRelationshipsFromDiscogs.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/ImportRelationshipsFromDiscogs.user.js)

## <a name="mb_batch_add_relationships_to_recordings"></a> Batch Add Relationships To Recordings

Insert buttons on the Release Edit Relationships page which add preconfigured Artists with their Relationship Type (instruments/vocal/performer).

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/BatchAddRelationshipsToRecordings.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/BatchAddRelationshipsToRecordings.user.js)
[![Screenshot](https://github.com/Aerozol/metabrainz-userscripts/raw/main/screenshots/Screenshot-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/screenshots/AddRelationships.png)

---

**Adapted from [loujine](https://github.com/loujine/musicbrainz-scripts)**

## <a name="mb_replace_release_relations_by_recording_relations"></a> Replace Release Relations By Recording Relations

Replace release relations by recording relations in relation editor.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/MoveReleaseRelationsToRecordings.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/MoveReleaseRelationsToRecordings.user.js)

## <a name="mb_clone_recording_relations_onto_other_relations"></a> Clone Recording Relations Onto Other Recordings

Clone recording relations onto other recordings in the relation editor

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/CloneRecordingRelations.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/CloneRecordingRelations.user.js)

## <a name="mb_set_role_recording_artist_relation"></a> Set Role In Recording-Artist Relation

Set/unset role relations on selected recordings in relation editor.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/SetRoleInRecording-ArtistRelation.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/SetRoleInRecording-ArtistRelation.user.js)

## <a name="mb_guess_related_works"></a> Guess Related Works In Batch

Guess related works in batch in relation editor.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/GuessRelatedWorks.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/GuessRelatedWorks.user.js)

## <a name="mb_set_relation_attributes"></a> Set Relation Attributes

Set attributes (live, partial, solo...) in relation editor.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/SetRelationAttributes.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/SetRelationAttributes.user.js)

## <a name="mb_copy_dates_on_recordings"></a> Copy Dates On Recording Relations

Copy/remove dates on recording relations in musicbrainz.relation editor

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/CopyDatesOnRecordingRelations.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/CopyDatesOnRecordingRelations.user.js)


<!-- ## <a name="mb_customizable_primarytype_selector"></a> Customizable PrimaryType Selector -->

<!-- Create buttons for quickly choosing the primary type when adding a new release. -->

<!-- [![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/CustomizablePrimaryTypeSelector.user.js) -->
<!-- [![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/CustomizablePrimaryTypeSelector.user.js) -->

<!-- ## <a name="mb_customizable_status_selector"></a> Customizable Status Selector -->

<!-- Create buttons for quickly choosing the status when adding a new release. -->

<!-- [![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/CustomizableStatusSlector.user.js) -->
<!-- [![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/CustomizableStatusSlector.user.js) -->

<!-- ## <a name="mb_customizable_packaging_selector"></a> CustomizablePackagingSelector -->

<!-- Create buttons for quickly choosing the package when adding a new release. -->

<!-- [![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/CustomizablePackagingSelector.user.js) -->
<!-- [![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/CustomizablePackagingSelector.user.js) -->

---

## <a name="sl_uuid_validator"></a> SpringstenLyrics - MusicBrainz UUID Validator

Validates MusicBrainz UUIDs when pasting them on the SpringstenLyrics website. Ensures the MusicBrainz ID field accepts only valid, lowercase UUIDs.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/MusicbrainzUUIDValidator.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/MusicbrainzUUIDValidator.user.js)

---

## <a name="#bb_auto_200_revisions"></a> Brucebase – Auto 200 Revisions

Select "200" for revisions per page BruceBase recent-changes.

[![Source](https://github.com/jerone/UserScripts/blob/master/_resources/Source-button.png)](https://github.com/vzell/mb-userscripts/blob/master/Auto200Revisions.user.js)
[![Install](https://raw.github.com/jerone/UserScripts/master/_resources/Install-button.png)](https://raw.githubusercontent.com/vzell/mb-userscripts/master/Auto200Revisions.user.js)

