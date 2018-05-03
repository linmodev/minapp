/******************************************************************
MIT License http://www.opensource.org/licenses/mit-license.php
Author Mora <qiuzhongleiabc@126.com> (https://github.com/qiu8310)
*******************************************************************/

/**
 * 从 minapp-example-ts 和 minapp-example-ts 中提取出源代码来
 */
import * as fs from 'fs-extra'
import * as info from 'mora-scripts/libs/sys/info'
import * as path from 'path'
import {walkDirectory} from './base/helper'

const ROOT_DIR = path.resolve(__dirname, '..')
const PKGS_DIR = path.resolve(ROOT_DIR, '..')
const TEMPLATE_DIR = path.join(ROOT_DIR, 'template')
const COMMON_DIR = path.join(ROOT_DIR, 'common')

const SOURCE_PROJECTS = fs.readdirSync(PKGS_DIR).filter(p => p.startsWith('minapp-example-'))

function internalMake() {
  SOURCE_PROJECTS.forEach(projectName => {
    let id = projectName.replace('minapp-', '')
    let projectFolder = path.join(PKGS_DIR, projectName)
    let distProjectFolder = path.join(TEMPLATE_DIR, id)

    // 所有的 common 文件夹
    let project = id.indexOf('component') > 0 ? 'Component' : 'Application'
    let commons = /-js$/.test(id) ? ['base', 'js'] : ['base', 'ts']
    let isExistsInCommon = (relative: string) => commons.some(d => fs.existsSync(path.join(COMMON_DIR, project, d, relative)))

    info('初始化目录 ' + distProjectFolder)
    fs.ensureDirSync(distProjectFolder)
    fs.emptyDirSync(distProjectFolder)

    walkDirectory(projectFolder, (dir, name, file, stat) => {
      if (stat.isDirectory() && dir === projectFolder && name !== 'src' && name !== '.vscode' && name !== '.dtpl') return false
      if (name === 'package-lock.json') return false

      let relative = path.relative(projectFolder, file)
      let distFile = path.join(distProjectFolder, relative)

      if (stat.isFile() && !isExistsInCommon(relative + '.dtpl')) {
        console.log('  ' + relative)
        let buffer: string | Buffer = fs.readFileSync(file)
        if (name === 'package.json') {
          buffer = updatePackageJson(JSON.parse(buffer.toString()), id)
        } else if (name === 'project.config.json') {
          buffer = updateProjectConfigJson(JSON.parse(buffer.toString()))
        }

        fs.ensureDirSync(path.dirname(distFile))
        fs.writeFileSync(distFile + '.dtpl', buffer)
      }

      return true
    })
  })
}

function updatePackageJson(json: any, id: string): string {
  json.name = '${name}'
  json.description = '${description}'
  json.author = '${author}'
  json.version = '${version}'

  delete json.publishConfig
  if (/-js$/.test(id) && json.devDependencies) {
    delete json.devDependencies.tslib
  }

  json.scripts.dev = 'minapp dev'
  json.scripts.clear = 'minapp clear dist'

  if (/-component-/.test(id)) {
    json.main = 'dist/${name}.js'
    json.scripts.build = 'minapp build --pretty' // 组件中图片会使用原路径
  } else {
    json.scripts.build = 'minapp build --publicPath http://your.static.server/'
  }

  return stringify(json)
}

function updateProjectConfigJson(json: any): string {
  json.appid = '${appid}'
  json.projectname = '${name}'
  json.description = '${description}'
  return stringify(json)
}

if (!module.parent) internalMake()

function stringify(obj: any) {
  return JSON.stringify(obj, null, 2)
}
