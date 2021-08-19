/* exported block_signal_by_name */
const GObject = imports.gi.GObject;
function block_signal_by_name(actor, signal_name) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [found, id, detail] = GObject.signal_parse_name(signal_name, actor, true);
	if (!found)
		return 0;
	const signalHandlerId = GObject.signal_handler_find(actor, GObject.SignalMatchType.ID, id, detail, null, null, null);
	if (!signalHandlerId)
		return 0;
	actor.block_signal_handler(signalHandlerId);
	return signalHandlerId;
}
