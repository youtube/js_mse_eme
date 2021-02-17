"""Tests to validate format of JSON files within YTS."""

import json
import os
import google3.pyglib.resources as resources
from google3.testing.pybase import googletest


class JsonValidationTest(googletest.TestCase):

  @classmethod
  def setUpClass(cls):
    super(JsonValidationTest, cls).setUpClass()

    # Collect all json files within the YTS directory for use in tests
    json_files_to_examine = []
    for path, _, files in resources.WalkResources(
        'google3/third_party/javascript/yts'):
      for file in files:
        if not file.endswith('.json'):
          continue
        fname = os.path.join(path, file)
        json_files_to_examine.append(fname)

    cls.all_json_files = json_files_to_examine

  def _filter_comments_from_json_string(self, json_str):
    return b'\n'.join([
        line for line in json_str.splitlines()
        if not line.startswith(b'//')
    ])

  def test_certification_programs_are_all_capitalized(self):
    for json_file in self.all_json_files:
      json_str = resources.GetResource(json_file)
      json_str = self._filter_comments_from_json_string(json_str)
      data = json.loads(json_str)
      for test_case in data['test_case']:
        tc = test_case['test_case']
        if 'certification_program' in tc:
          cert_programs = tc['certification_program']
          for program in cert_programs:
            if not program.isupper():
              raise ValueError(f'Expected "{program}" to be entirely uppercase')

  def test_capabilities_are_all_capitalized(self):
    for json_file in self.all_json_files:
      json_str = resources.GetResource(json_file)
      json_str = self._filter_comments_from_json_string(json_str)
      data = json.loads(json_str)
      for test_case in data['test_case']:
        tc = test_case['test_case']
        if 'capabilities' in tc:
          capabilities = tc['capabilities']
          for capability in capabilities:
            if not capability.isupper():
              raise ValueError(
                  f'Expected "{capability}" to be entirely uppercase')


if __name__ == '__main__':
  googletest.main()
