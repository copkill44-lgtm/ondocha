from pathlib import Path
from urllib.parse import urlsplit
import unittest
import quickjs

class AvatarTests(unittest.TestCase):
    def setUp(self):
        self.ctx=quickjs.Context()
        self.ctx.eval("let characterConfig={hair:'tiedLong',skin:'toneB'};")
        self.ctx.eval(Path('scripts/avatar.js').read_text(encoding='utf-8'))
    def test_selected_character_layers_are_used(self):
        svg=self.ctx.eval("renderOutfitAvatar({bottom:['pants']},0)")
        self.assertIn('body-dark.png',svg)
        self.assertIn('hair-open-long.png',svg)
    def test_unknown_asset_names_use_safe_defaults(self):
        body=self.ctx.eval("characterImageLayers({skin:'bad',hair:'bad'}).body")
        self.assertIn('body-default.png',body)
    def test_saved_snapshot_overrides_current_character(self):
        svg=self.ctx.eval("renderOutfitAvatar({bottom:['pants']},0,{skin:'toneA',hair:'openBob'})")
        self.assertIn('body-light.png',svg)
        self.assertIn('hair-covered-bob.png',svg)
        self.assertNotIn('body-dark.png',svg)
    def test_existing_source_images_exist(self):
        for skin in ['default','toneA','toneB']:
            for hair in ['open','openLong','tied','tiedLong','openBob','tiedBob']:
                for field in ['body','hair']:
                    value=self.ctx.eval("characterImageLayers({skin:'"+skin+"',hair:'"+hair+"'})."+field)
                    self.assertTrue(Path(urlsplit(value).path).is_file(),value)

if __name__=='__main__':unittest.main()
