import htmlmin, os, urllib, tempfile, webbrowser, time, sys
from slimmer import html_slimmer, css_slimmer
from jsmin import jsmin
from BeautifulSoup import BeautifulSoup
from argparse import ArgumentParser

# make utf-8 work
reload(sys)
sys.setdefaultencoding('utf8')

argument_parser = ArgumentParser(description='Settings for preparing html for your microcontroller')
argument_parser.add_argument('-i', '--input', dest='input_path', help='HTML file to be minified, default is index.html', default='index.html')
argument_parser.add_argument('-o', '--output', dest='output_path', help='Path to place output file, default is webpage.h', default='webpage.h')
argument_parser.add_argument('-s', '--maxsize', dest='max_size', help='The maximum size in bytes your microcontroller can handle, default is 32768 bytes (32kb)', default='32768')
arguments = argument_parser.parse_args()

input_path = arguments.input_path
output_path = arguments.output_path
max_size = int(arguments.max_size)

current_directory = os.path.dirname(__file__)
html_path = os.path.join(current_directory, input_path)

minified_html = ''
total_size = os.path.getsize(html_path)

print('Started minifying...')

with open(html_path, 'r') as html_file:
    html = html_file.read()
    soup = BeautifulSoup(html)

    # Replace all link tags with inline minified style
    all_style = '<style>'
    for link in soup.findAll('link'):
        # Get the content from the url (either local or on a website works)
        href = link.get('href')
        content = urllib.urlopen(href).read()
        all_style += content
        # Remove this link, we'll add the minified contents later
        html = html.replace(str(link), '')

    # Replace all style tags with minified style
    for style in soup.findAll('style'):
        content = style.text
        all_style += content
        # Remove this style tag, we'll add the minified contents later
        html = html.replace(str(style), '')
    
    total_size += len(all_style.encode('utf-8'))
    all_style += '</style>'
    all_minified_style = css_slimmer(all_style)
    html = html.replace('</head>', '%s</head>' % all_minified_style)

    # Replace all script tags with minified script
    all_script = '<script>'
    for script in soup.findAll('script'):
        src = script.get('src')
        if (src != None):
            all_script += urllib.urlopen(src).read()
        else:
            all_script += script.text
        html = html.replace(str(script), '')

    total_size += len(all_script.encode('utf-8'))
    all_script += '</script>'
    all_minified_script = jsmin(all_script)

    html = html.replace('</body>', '%s</body>' % all_minified_script)


# Minify the resulting html
minified_html = html_slimmer(html)

# Create cpp header string
cpp_string = '#ifndef __webpage_h__\n'
cpp_string += '#define _webpage_h__\n'
cpp_string += 'PROGMEM extern const String html = R"~(' + minified_html.replace('\n', '') + ')~";\n'
cpp_string += '#endif'
absolute_output_path = os.path.join(current_directory, output_path)
amount_of_bytes = 0
with open(absolute_output_path, 'w+') as output_file:
    # Write string to header file
    output_file.write(cpp_string)
    output_file.flush()
    # Calculate the size of our file
    amount_of_bytes = os.path.getsize(absolute_output_path)
    if amount_of_bytes > max_size:
        raise Exception('The size of the minified html content is too high, the maximum is: %i and the size of the minified content is: %i' % (max_size, amount_of_bytes))
    else:
        # Open the minified html to check if everything works
        with open('temp.html', 'w+') as temp_file:
            temp_file.write(minified_html)
            temp_file.flush()
        
        os.system('start temp.html')

print('Success, minified everything to one line of HTML, which is available for checking in an opened browser window.')
print('Original size: %ib, minified size: %ib, max size: %ib, percentage of max size used: %i%%' % (total_size, amount_of_bytes, max_size, amount_of_bytes * 100 / max_size))

# Remove temporary html file
time.sleep(1)
os.remove('temp.html')