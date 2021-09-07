// 工作区文件操作相关

import path = require("path");
import { ProgressLocation, Uri, window as Window, workspace } from "vscode";

import { JSON_SPACE } from "./constant";

// 初始化工作区国际化配置文件
// 判断依据仅仅是，工作区 src 路径下是否有 intl 配置文件夹
// todo 之后可能需要优化
export const initializeWorkplaceIntlConfig = async (intlTempPath: string, workspaceIntlConfigPath?: Uri) =>
{
	if (!workspaceIntlConfigPath) return

	try
	{
		await workspace.fs.stat(workspaceIntlConfigPath)
		console.log('does workspace intl config exist')
	}
	catch (e)
	{
		console.log('nope, workspace intl config does not exist')

		// 若拷贝失败，抛出错误
		await workspace.fs.copy(Uri.file(intlTempPath), workspaceIntlConfigPath)
	}
}

// 获取国际化 json 配置文件
export const getIntlConfig = async (
	workspaceIntlConfigPath?: Uri
): Promise<[Record<string, string> | undefined, Record<string, string> | undefined]> =>
{
	if (!workspaceIntlConfigPath) return [undefined, undefined]

	// 工作区国际化配置文件路径
	const zhPath = Uri.joinPath(workspaceIntlConfigPath, path.join('/zh_CN.json'))
	const enPath = Uri.joinPath(workspaceIntlConfigPath, path.join('/en_US.json'))

	// 获取工作区国际化配置文件内容
	const [rawZHConfig, rawENConfig] = await Promise.all([
		workspace.fs.readFile(zhPath),
		workspace.fs.readFile(enPath),
	])

	// todo 调研有没有性能更好的 JSON 转化库
	const [zhConfig, enConfig] = await Promise.all<Record<string, string>>([
		Promise.resolve<Record<string, string>>(JSON.parse(rawZHConfig.toString())),
		Promise.resolve<Record<string, string>>(JSON.parse(rawENConfig.toString())),
	])

	return [zhConfig, enConfig]
}

// 将翻译内容写入现有工作区的国际化配置中
// 将 keys 排序后返回新的配置对象
export const writeResultIntoIntlConfig = async (
	intlId: string,
	zhText: string,
	enText: string,
	zhConfig?: Record<string, string>,
	enConfig?: Record<string, string>,
): Promise<[Record<string, string>, Record<string, string>]> =>
{
	const _zhConfig: Record<string, string> = {}
	const _enConfig: Record<string, string> = {}

	// 处理新的国际化配置内容
	// 包括写入新对象，重新将 key 排序
	const resolveZhConfig = new Promise<Record<string, string>>((resolve, reject) =>
	{
		if (!zhConfig) return reject()

		zhConfig[intlId] = zhText
		Object
			.keys(zhConfig)
			.sort(new Intl.Collator('en-US').compare)
			.forEach(id => _zhConfig[id] = zhConfig[id])
		return resolve(_zhConfig)

	})

	const resolveEnConfig = new Promise<Record<string, string>>((resolve, reject) =>
	{
		if (!enConfig) return reject()

		enConfig[intlId] = enText
		Object
			.keys(enConfig)
			.sort(new Intl.Collator('en-US').compare)
			.forEach(id => _enConfig[id] = enConfig[id])
		return resolve(_enConfig)

	})

	return Promise.all([resolveZhConfig, resolveEnConfig])
}

// 将新的国际化配置对象写入工作区
export const writeConfigIntoWorkSpace = async (zhConfig: Record<string, string>, enConfig: Record<string, string>, workspaceIntlConfigPath?: Uri) =>
{
	if (!workspaceIntlConfigPath) return

	// 工作区国际化配置文件路径
	const zhPath = Uri.joinPath(workspaceIntlConfigPath, path.join('/zh_CN.json'))
	const enPath = Uri.joinPath(workspaceIntlConfigPath, path.join('/en_US.json'))

	return await Window.withProgress({
		cancellable: false,
		location: ProgressLocation.Window,
		title: `正在写入国际化配置...`,
	}, async () =>
	{
		return await Promise.all([
			workspace.fs.writeFile(zhPath, Buffer.from(JSON.stringify(zhConfig, null, JSON_SPACE))),
			workspace.fs.writeFile(enPath, Buffer.from(JSON.stringify(enConfig, null, JSON_SPACE))),
		])
	})
}