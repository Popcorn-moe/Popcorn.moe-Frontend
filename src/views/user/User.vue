<template>
	<loader v-if="!user"></loader>
	<div class="user-page" v-else>
		<upload v-if="page === 'settings'" class="background-upload" @input="setBackground">
			<v-icon>file_upload</v-icon>
		</upload>
		<div class="user-page-banner px-2" :style="{ 'background-image': user.background && `url(${user.background})` }">
			<div class="user-container">
				<template v-if="page === 'settings'">
					<upload class="avatar-upload" @input="setAvatar">
						<v-icon>file_upload</v-icon>
						<img class="user-avatar" :src="user.avatar">
					</upload>
				</template>
				<img v-else class="user-avatar" :src="user.avatar">
				<div class="user-data text-xs-center">
					<span class="login">{{ user.login }}</span>
					<v-btn class="primary follow text--primary" :outline="user.isFollower" v-if="!isMe" @click.stop="toggleFollow">{{ user.isFollower ? "Unfollow" : "Follow"}}</v-btn>
				</div>
			</div>
			<div class="user-top-nav">
				<v-tabs :value="page" @input="changeUrl">
					<v-tab activeClass="active" href="#profile" >{{ $t('route.auth.profile') }}</v-tab>
					<v-tab activeClass="active" href="#library" >{{ $t('route.auth.library') }}</v-tab>
					<v-tab activeClass="active" href="#follows" >{{ $t('route.auth.follows') }}</v-tab>
					<v-tab activeClass="active" href="#followers" >{{ $t('route.auth.followers') }}</v-tab>
					<v-tab activeClass="active" href="#settings" class="right" v-if="isMe">{{ $t('route.auth.settings') }}</v-tab>
				</v-tabs>
			</div>
		</div>
		<v-tabs-items :value="page" @input="changeUrl">
			<v-tab-item id="profile">
				<user-profile :userId="user.id"></user-profile>
			</v-tab-item>
			<v-tab-item id="library">
				<user-library :user="user"></user-library>
			</v-tab-item>
			<v-tab-item id="follows">
				<user-follows :user="user"></user-follows>
			</v-tab-item>
			<v-tab-item id="followers">
				<user-followers :user="user"></user-followers>
			</v-tab-item>
			<v-tab-item id="settings" v-if="isMe">
				<user-settings></user-settings>
			</v-tab-item>
		</v-tabs-items>
	</div>
</template>

<script>
import UserSettings from "./Settings";
import UserLibrary from "./Library";
import UserFollows from "./Follows";
import UserFollowers from "./Followers";
import UserProfile from "./Profile";
import Upload from "../../components/Upload";
import Loader from "../../components/layout/Loader";
import clone from "clone";

import {
	VTabs,
	VTab,
	VTabsItems,
	VTabItem
} from "vuetify/es5/components/VTabs";
import { VBtn, VIcon } from "vuetify";
import gql from "graphql-tag";
import { throws } from "assert";

export default {
	name: "user-page",
	props: ["page", "userLogin"],
	data() {
		return {
			user: null,
			me: false
		};
	},
	components: {
		VTabs,
		VTab,
		VTabItem,
		VTabsItems,
		UserLibrary,
		UserSettings,
		UserFollows,
		UserFollowers,
		UserProfile,
		Upload,
		Loader,
		VBtn,
		VIcon
	},
	methods: {
		changeUrl(value) {
			let name;
			let params = {};
			switch (value) {
				case "settings":
					name = "UserSettings";
					break;
				case "library":
					name = `LibraryAnimeStatus`;
					params = { status: "want-to-watch" };
					break;
				default:
					name = "User";
					break;
			}
			this.$router.push({
				name,
				params: Object.assign({}, this.$route.params, {
					page: value,
					...params
				})
			});
		},
		goto404() {
			this.$router.replace({ name: "404" });
		},
		toggleFollow() {
			this.$apollo
				.mutate({
					mutation: gql`
					mutation toggleFollow($id: ID!) {
						${this.user.isFollower ? "unfollow" : "follow"}(id: $id)
					}
				`,
					variables: {
						id: this.user.id
					}
				})
				.then(() => {
					this.$apollo.queries.user.refetch();
				});
		},
		setAvatar([file]) {
			this.$apollo
				.mutate({
					mutation: gql`
						mutation($file: Upload!) {
							setAvatar(file: $file) {
								error
							}
						}
					`,
					variables: {
						file
					}
				})
				.then(data => {
					this.$apollo.queries.user.refetch();
				});
		},
		setBackground([file]) {
			this.$apollo
				.mutate({
					mutation: gql`
						mutation($file: Upload!) {
							setBackground(file: $file) {
								error
							}
						}
					`,
					variables: {
						file
					}
				})
				.then(data => {
					this.$apollo.queries.user.refetch();
				});
		}
	},
	computed: {
		isMe() {
			return this.me && this.user && this.me.id === this.user.id;
		}
	},
	apollo: {
		user: {
			query() {
				return gql`
					query user($name: String! ${this.me ? ", $me: ID!" : ""}) {
						user(name: $name) {
							id
							avatar
							background
							login
							${this.me ? "isFollower(id: $me)" : ""}
							follows {
								id
								login
								avatar
                				background
							}
							followers {
								id
								login
								avatar
                				background
							}
							metas {
								anime { 
									id
									names
									cover {
										normal
									}
									authors {
										name
									}
								}
								status
							}
						}
						
					}
				`;
			},
			fetchPolicy: "network-only",
			variables() {
				return {
					name: this.userLogin,
					me: this.me && this.me.id
				};
			},
			skip() {
				return !this.userLogin || this.me === false;
			},
			update: ({ user }) => user
		},
		me: {
			query: gql`
				{
					me {
						id
					}
				}
			`,
			update: ({ me }) => me
		}
	},
	watch: {
		user(newUser) {
			if (!newUser) this.goto404();
		}
	}
};
</script>

<style lang="stylus">
	@import "../../stylus/main.styl";

	$profilePic = 150px;
	$bannerHeight = 300px;

	.user-page {
		height: 100%;

		.background-upload {
			position: absolute;
			height: $bannerHeight;
			background: black;
			opacity: 0.6;
			transition: opacity 300ms;
			z-index: 1;

			&:hover {
				opacity: 0.4;
			}

			.v-icon {
				color: white;
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				font-size: 58px;
			}
		}

		.user-page-banner {
			width: 100%;
			height: $bannerHeight;
			background-image: url(https://images6.alphacoders.com/505/thumb-1920-505441.jpg);
			background-size: cover;
			background-repeat: no-repeat;
			background-position: center;
			background-color: #2f2f2f;
			box-shadow: inset 0 -50px 60px -35px #000000;
			position: relative;

			.user-container {
				position: relative;
				left: "calc(12.5% - %s)" % ($profilePic / 2);
				padding-top: ($profilePic / 2);

				.user-avatar {
					display: inline-block;
					float: left;
					width: $profilePic;
					height: $profilePic;
					border-radius: 100%;
				}

				.user-data {
					position: absolute;
					display: inline-block;
					font-size: 25px;
					padding-left: 20px;
					padding-top: ($profilePic / 2 - 25px)
					width: 150px;

					.follow {
						margin: 0 !important;
					}
				}

				.avatar-upload {
					width: $profilePic;
					height: $profilePic;
					z-index: 2;

					.v-icon {
						color: white;
						border-radius: 100%;
						width: 100%;
						height: 100%;
						position: absolute;
						top: 50%;
						left: 50%;
						transform: translate(-50%, -50%) !important;
						z-index: 1;
						font-size: 58px;
						background: black;
						opacity: 0.6;
						transition: opacity 300ms;
						text-align: center;
						line-height: 150px;

						&:hover {
							opacity: 0.4;
						}
					}
				}
			}

			.user-top-nav {
				position: absolute;
				bottom: 0;
				width: 100%;
				z-index: 2;

				& > .tabs {
					width: 100%;
				}

				a {
					color: white !important;
				}

				.v-tabs__bar {
					background-color: transparent !important;
				}

				.v-tabs__wrapper {
					margin: 0 10px !important;
				}

				.right {
					margin-left: auto;
					margin-right 10px;
				}

				.active {
					color: white !important;
					font-weight: bold;
					background: linear-gradient(transparent, $main-color);
				}
			}
		}

		.tabs__items {
			height: "calc(100% - %s)" % $bannerHeight;
			.tabs__content {
				height: 100%;
			}
		}

		@media (max-width: 600px) {
			.user-page-banner {
				height: 400px;
				padding: 0 !important;

				.user-container {
					width: 150px;
					left: "calc(50%  - %s)" % ($profilePic / 2);
					display: block;
					margin: 0;

					.user-avatar {
						float none;
					}

					.user-data {
						width: 100%;
						padding-top: 0;
						padding-left: 0;
						display: block;
						.follow {
							width: 100%;
						}
					}
				}
			}

			.background-upload {
				height: 400px;

				.v-icon {
					top: 75%;
				}
			}
		}
	}

	.application.theme--dark .user-page {
		.user-page-banner {
			-moz-box-shadow: none;
			-webkit-box-shadow: none;
			box-shadow: none;
		}
		.user-cover {
			border-color: $grey.darken-3;
		}
	}
</style>
